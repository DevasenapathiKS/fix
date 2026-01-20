import JobCard from '../models/jobcard.model.js';
import Order from '../models/order.model.js';
import ServiceItem from '../models/service-item.model.js';
import ApiError from '../utils/api-error.js';
import { JOB_STATUS, ORDER_STATUS, NOTIFICATION_EVENTS } from '../constants/index.js';
import { notificationService } from './notification.service.js';
import { orderHistoryService } from './order-history.service.js';

const recalculateCharges = (jobCard) => {
  const extraTotal = (jobCard.extraWork || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const spareTotal = (jobCard.sparePartsUsed || []).reduce(
    (sum, part) => sum + Number(part.quantity || 0) * Number(part.unitPrice || 0),
    0
  );
  jobCard.additionalCharges = extraTotal + spareTotal;
  jobCard.finalAmount = Number(jobCard.estimateAmount || 0) + jobCard.additionalCharges;
  return { extraTotal, spareTotal };
};

export const JobcardService = {
  async getJobCardByOrder(orderId) {
    const jobCard = await JobCard.findOne({ order: orderId });
    if (!jobCard) throw new ApiError(404, 'Job card not found');
    return jobCard;
  },

  async checkIn({ jobCardId, technicianId, lat, lng, note }) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }

    const isFirstCheckIn = !jobCard.checkIns?.length;
    
    jobCard.checkIns.push({
      timestamp: new Date(),
      location: { type: 'Point', coordinates: [lng, lat] },
      note
    });
    jobCard.status = JOB_STATUS.CHECKED_IN;
    await jobCard.save();

    await Order.findByIdAndUpdate(jobCard.order, {
      technicianTracking: {
        lastCheckInAt: new Date(),
        location: { type: 'Point', coordinates: [lng, lat] }
      }
    });

    // Add history entry for check-in
    await orderHistoryService.recordEntry({
      orderId: jobCard.order,
      action: isFirstCheckIn ? 'technician_checked_in' : 'technician_progress_update',
      message: isFirstCheckIn 
        ? 'Technician checked in at location' 
        : note || 'Technician progress update',
      metadata: { 
        jobCardId, 
        location: { lat, lng },
        note: note || undefined
      },
      performedBy: technicianId
    });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.JOB_UPDATED, {
      orderId: jobCard.order,
      jobCardId
    });

    const order = await Order.findById(jobCard.order);
    if (order?.customerUser) {
      await notificationService.notifyCustomer(order.customerUser, NOTIFICATION_EVENTS.TECHNICIAN_CHECKED_IN, {
        recipient: order.customerUser,
        orderId: order._id,
        jobCardId,
        location: { lat, lng }
      });
    }

    return jobCard;
  },

  async checkout({ jobCardId, technicianId, otp }) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }

    if (!jobCard.otp) {
      throw new ApiError(400, 'OTP not configured for this job card');
    }

    if (String(jobCard.otp) !== String(otp)) {
      throw new ApiError(400, 'Invalid OTP provided');
    }

    // Record a history entry that OTP-based checkout was verified
    await orderHistoryService.recordEntry({
      orderId: jobCard.order,
      action: 'technician_checkout_otp_verified',
      message: 'Technician checked out with OTP verification',
      metadata: {
        jobCardId,
        otpVerified: true
      },
      performedBy: technicianId
    });

    await notificationService.notifyAdmin(NOTIFICATION_EVENTS.JOB_UPDATED, {
      orderId: jobCard.order,
      jobCardId
    });

    return jobCard;
  },

  async addExtraWork({ jobCardId, technicianId, workItems }) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }
    if (!jobCard.checkIns?.length) {
      throw new ApiError(400, 'Check in before adding extra work');
    }

    if (!Array.isArray(workItems) || workItems.length === 0) {
      throw new ApiError(400, 'At least one work item is required');
    }

    const normalizedItems = [];
    const approvalEntries = [];

    for (const item of workItems) {
      if (!item.serviceCategory) {
        throw new ApiError(400, 'Service category is required');
      }
      if (!item.serviceItem) {
        throw new ApiError(400, 'Service sub category is required');
      }

      const serviceItemDoc = await ServiceItem.findById(item.serviceItem)
        .populate('category', 'name description')
        .lean();
      if (!serviceItemDoc) {
        throw new ApiError(404, 'Service item not found');
      }
      if (serviceItemDoc.isActive === false) {
        throw new ApiError(400, 'Service item is inactive');
      }

      const categoryId = serviceItemDoc.category?._id || serviceItemDoc.category;
      if (String(categoryId) !== String(item.serviceCategory)) {
        throw new ApiError(400, 'Service item does not belong to selected category');
      }

      const amount = typeof item.amount === 'number' && !Number.isNaN(item.amount) ? item.amount : serviceItemDoc.basePrice;
      if (!amount || amount <= 0) {
        throw new ApiError(400, 'Amount must be greater than zero');
      }

      const description = (item.description || serviceItemDoc.name || '').trim();
      if (!description) {
        throw new ApiError(400, 'Description is required');
      }

      const normalized = {
        description,
        amount,
        serviceCategory: categoryId,
        serviceItem: serviceItemDoc._id
      };
      normalizedItems.push(normalized);
      approvalEntries.push({
        type: 'extra_work',
        description,
        amount,
        serviceCategory: categoryId,
        serviceItem: serviceItemDoc._id,
        serviceName: serviceItemDoc.name
      });
    }

    jobCard.extraWork.push(...normalizedItems);
    recalculateCharges(jobCard);
    await jobCard.save();

    const order = await Order.findById(jobCard.order);
    if (order) {
      order.customerApproval = order.customerApproval || {};
      order.customerApproval.status = 'pending';
      order.customerApproval.requestedItems = [...(order.customerApproval.requestedItems || []), ...approvalEntries];
      order.customerApproval.history = [
        ...(order.customerApproval.history || []),
        { status: 'pending', note: 'Awaiting customer approval', performedAt: new Date() }
      ];
      await order.save();

      if (order.customerUser) {
        await notificationService.notifyCustomer(order.customerUser, NOTIFICATION_EVENTS.CUSTOMER_APPROVAL_REQUIRED, {
          recipient: order.customerUser,
          orderId: order._id,
          reason: 'extra_work'
        });
      }
    }

    return jobCard;
  },

  async addSpareParts({ jobCardId, technicianId, parts }) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }
    if (!jobCard.checkIns?.length) {
      throw new ApiError(400, 'Check in before adding spare parts');
    }

    jobCard.sparePartsUsed.push(...parts);
    recalculateCharges(jobCard);
    await jobCard.save();

    const order = await Order.findById(jobCard.order);
    if (order) {
      order.customerApproval = order.customerApproval || {};
      order.customerApproval.status = 'pending';
      order.customerApproval.requestedItems = [
        ...(order.customerApproval.requestedItems || []),
        ...parts.map((part) => ({
          type: 'spare_part',
          description: 'Spare part usage',
          quantity: part.quantity,
          unitPrice: part.unitPrice,
          part: part.part,
          amount: part.quantity * part.unitPrice
        }))
      ];
      order.customerApproval.history = [
        ...(order.customerApproval.history || []),
        { status: 'pending', note: 'Awaiting customer approval', performedAt: new Date() }
      ];
      await order.save();

      if (order.customerUser) {
        await notificationService.notifyCustomer(order.customerUser, NOTIFICATION_EVENTS.CUSTOMER_APPROVAL_REQUIRED, {
          recipient: order.customerUser,
          orderId: order._id,
          reason: 'spare_part'
        });
      }
    }

    return jobCard;
  },

  async removeExtraWork({ jobCardId, technicianId, itemIndex }) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }

    if (!Array.isArray(jobCard.extraWork) || jobCard.extraWork.length === 0) {
      throw new ApiError(404, 'No extra work recorded');
    }
    if (typeof itemIndex !== 'number' || itemIndex < 0 || itemIndex >= jobCard.extraWork.length) {
      throw new ApiError(404, 'Extra work entry not found');
    }

    const [removed] = jobCard.extraWork.splice(itemIndex, 1);
    recalculateCharges(jobCard);
    await jobCard.save();

    const order = await Order.findById(jobCard.order);
    if (order?.customerApproval?.requestedItems?.length) {
      let removedSynced = false;
      order.customerApproval.requestedItems = order.customerApproval.requestedItems.filter((item) => {
        if (removedSynced) return true;
        if (item.type !== 'extra_work') return true;
        const matchesServiceItem =
          (!removed.serviceItem && !item.serviceItem) ||
          (removed.serviceItem && item.serviceItem && String(item.serviceItem) === String(removed.serviceItem));
        const matchesServiceCategory =
          (!removed.serviceCategory && !item.serviceCategory) ||
          (removed.serviceCategory && item.serviceCategory && String(item.serviceCategory) === String(removed.serviceCategory));
        const matchesAmount = Number(item.amount) === Number(removed.amount);
        const matchesDescription = (item.description || '').trim() === (removed.description || '').trim();
        if (matchesServiceItem && matchesServiceCategory && matchesAmount && matchesDescription) {
          removedSynced = true;
          return false;
        }
        return true;
      });
      if (!order.customerApproval.requestedItems.length) {
        order.customerApproval.status = 'not_required';
      }
      await order.save();
    }

    return jobCard;
  },

  async removeSparePart({ jobCardId, technicianId, itemIndex }) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }

    if (!Array.isArray(jobCard.sparePartsUsed) || jobCard.sparePartsUsed.length === 0) {
      throw new ApiError(404, 'No spare parts recorded');
    }
    if (typeof itemIndex !== 'number' || itemIndex < 0 || itemIndex >= jobCard.sparePartsUsed.length) {
      throw new ApiError(404, 'Spare part entry not found');
    }

    const [removed] = jobCard.sparePartsUsed.splice(itemIndex, 1);
    recalculateCharges(jobCard);
    await jobCard.save();

    const order = await Order.findById(jobCard.order);
    if (order?.customerApproval?.requestedItems?.length) {
      let removedSynced = false;
      order.customerApproval.requestedItems = order.customerApproval.requestedItems.filter((item) => {
        if (removedSynced) return true;
        if (item.type !== 'spare_part') return true;
        const matchesPart =
          (!removed.part && !item.part) ||
          (removed.part && item.part && String(item.part) === String(removed.part));
        const matchesQty = Number(item.quantity) === Number(removed.quantity);
        const matchesRate = Number(item.unitPrice) === Number(removed.unitPrice);
        if (matchesPart && matchesQty && matchesRate) {
          removedSynced = true;
          return false;
        }
        return true;
      });
      if (!order.customerApproval.requestedItems.length) {
        order.customerApproval.status = 'not_required';
      }
      await order.save();
    }

    return jobCard;
  },

  async updateEstimate({ jobCardId, technicianId, estimateAmount }) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }

    jobCard.estimateAmount = estimateAmount;
    jobCard.finalAmount = estimateAmount + jobCard.additionalCharges;
    return jobCard.save();
  },

  async completeJob({ jobCardId, technicianId, resolution = 'completed', paymentStatus = 'paid', followUpNote }) {
    const allowedResolutions = ['completed', 'follow_up'];
    const allowedPayments = ['paid', 'pending', 'partial'];
    if (!allowedResolutions.includes(resolution)) {
      throw new ApiError(400, 'Invalid resolution');
    }
    if (!allowedPayments.includes(paymentStatus)) {
      throw new ApiError(400, 'Invalid payment status');
    }

    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    if (String(jobCard.technician) !== String(technicianId)) {
      throw new ApiError(403, 'Not allowed to update this job');
    }
    const order = await Order.findById(jobCard.order);
    if (!order) throw new ApiError(404, 'Order missing for this job');

    jobCard.paymentStatus = paymentStatus;

    if (resolution === 'follow_up') {
      jobCard.status = JOB_STATUS.FOLLOW_UP;
      order.status = ORDER_STATUS.FOLLOW_UP;
      order.followUp = {
        ...(order.followUp || {}),
        reason: followUpNote?.trim() || 'Technician requested follow up',
        attachments: order.followUp?.attachments || [],
        createdAt: new Date(),
        createdBy: technicianId
      };

      // Add history entry for follow-up
      await orderHistoryService.recordEntry({
        orderId: order._id,
        action: 'technician_follow_up',
        message: followUpNote?.trim() || 'Technician marked job for follow up',
        metadata: { 
          jobCardId, 
          resolution,
          paymentStatus 
        },
        performedBy: technicianId
      });
    } else {
      jobCard.status = JOB_STATUS.COMPLETED;
      order.status = ORDER_STATUS.COMPLETED;
      if (order.followUp) {
        order.followUp = {
          ...order.followUp,
          resolvedAt: new Date()
        };
      }

      // Add history entry for checkout/completion
      await orderHistoryService.recordEntry({
        orderId: order._id,
        action: 'technician_checked_out',
        message: 'Technician checked out - job completed',
        metadata: { 
          jobCardId, 
          resolution,
          paymentStatus,
          finalAmount: jobCard.finalAmount
        },
        performedBy: technicianId
      });
    }

    await jobCard.save();
    await order.save();
    return jobCard;
  },

  async lockJobCard(jobCardId) {
    const jobCard = await JobCard.findById(jobCardId);
    if (!jobCard) throw new ApiError(404, 'Job card missing');
    jobCard.status = JOB_STATUS.LOCKED;
    jobCard.lockedAt = new Date();
    return jobCard.save();
  }
};
