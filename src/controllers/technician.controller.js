import asyncHandler from '../utils/async-handler.js';
import { TechnicianService } from '../services/technician.service.js';
import { JobcardService } from '../services/jobcard.service.js';
import { successResponse } from '../utils/response.js';

export const updateAvailability = asyncHandler(async (req, res) => {
  const data = await TechnicianService.updateAvailability(req.user.id, req.body.entries || []);
  return successResponse(res, { data, message: 'Availability updated' });
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await TechnicianService.getProfile(req.user.id);
  return successResponse(res, { data: profile });
});

export const getAvailability = asyncHandler(async (req, res) => {
  const data = await TechnicianService.getAvailability(req.user.id);
  return successResponse(res, { data });
});

export const listJobCards = asyncHandler(async (req, res) => {
  const jobs = await TechnicianService.listJobCards(req.user.id, req.query);
  return successResponse(res, { data: jobs });
});

export const listActiveJobsToday = asyncHandler(async (req, res) => {
  const jobs = await TechnicianService.listActiveJobsToday(req.user.id);
  return successResponse(res, { data: jobs });
});

export const getJobCardDetail = asyncHandler(async (req, res) => {
  const payload = await TechnicianService.getJobCardDetailForTechnician(req.params.jobCardId, req.user.id);
  return successResponse(res, { data: payload });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await TechnicianService.listNotifications(req.user.id, req.query);
  return successResponse(res, { data: notifications });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await TechnicianService.markNotificationRead(req.params.notificationId, req.user.id);
  return successResponse(res, { data: notification, message: 'Notification updated' });
});

export const listSpareParts = asyncHandler(async (_req, res) => {
  const parts = await TechnicianService.listSpareParts();
  return successResponse(res, { data: parts });
});

export const listServiceCatalog = asyncHandler(async (_req, res) => {
  const catalog = await TechnicianService.listServiceCatalog();
  return successResponse(res, { data: catalog });
});

export const checkIn = asyncHandler(async (req, res) => {
  const { jobCardId } = req.params;
  const { lat, lng, note } = req.body;
  const jobCard = await JobcardService.checkIn({ jobCardId, technicianId: req.user.id, lat, lng, note });
  return successResponse(res, { data: jobCard, message: 'Check-in recorded' });
});

export const checkOut = asyncHandler(async (req, res) => {
  const { jobCardId } = req.params;
  const { otp } = req.body;
  const jobCard = await JobcardService.checkout({ jobCardId, technicianId: req.user.id, otp });
  return successResponse(res, { data: jobCard, message: 'Checkout recorded' });
});

export const addExtraWork = asyncHandler(async (req, res) => {
  const jobCard = await JobcardService.addExtraWork({
    jobCardId: req.params.jobCardId,
    technicianId: req.user.id,
    workItems: req.body.items || []
  });
  return successResponse(res, { data: jobCard, message: 'Extra work added' });
});

export const addSpareParts = asyncHandler(async (req, res) => {
  const jobCard = await JobcardService.addSpareParts({
    jobCardId: req.params.jobCardId,
    technicianId: req.user.id,
    parts: req.body.parts || []
  });
  return successResponse(res, { data: jobCard, message: 'Spare parts updated' });
});

export const removeExtraWork = asyncHandler(async (req, res) => {
  const jobCard = await JobcardService.removeExtraWork({
    jobCardId: req.params.jobCardId,
    technicianId: req.user.id,
    itemIndex: Number(req.params.itemIndex)
  });
  return successResponse(res, { data: jobCard, message: 'Extra work removed' });
});

export const removeSparePart = asyncHandler(async (req, res) => {
  const jobCard = await JobcardService.removeSparePart({
    jobCardId: req.params.jobCardId,
    technicianId: req.user.id,
    itemIndex: Number(req.params.itemIndex)
  });
  return successResponse(res, { data: jobCard, message: 'Spare part removed' });
});

export const updateEstimate = asyncHandler(async (req, res) => {
  const jobCard = await JobcardService.updateEstimate({
    jobCardId: req.params.jobCardId,
    technicianId: req.user.id,
    estimateAmount: req.body.estimateAmount
  });
  return successResponse(res, { data: jobCard, message: 'Estimate updated' });
});

export const completeJob = asyncHandler(async (req, res) => {
  const jobCard = await JobcardService.completeJob({
    jobCardId: req.params.jobCardId,
    technicianId: req.user.id,
    resolution: req.body.resolution,
    paymentStatus: req.body.paymentStatus,
    followUpNote: req.body.followUpNote
  });
  return successResponse(res, { data: jobCard, message: 'Job marked as completed' });
});

export const uploadJobMedia = asyncHandler(async (req, res) => {
  const payload = await TechnicianService.addOrderMediaForTechnician(
    req.params.jobCardId,
    req.user.id,
    req.body.media || []
  );
  return successResponse(res, { data: payload, message: 'Media uploaded successfully' });
});

export const deleteJobMedia = asyncHandler(async (req, res) => {
  const payload = await TechnicianService.removeOrderMediaForTechnician(
    req.params.jobCardId,
    req.user.id,
    req.params.mediaId
  );
  return successResponse(res, { data: payload, message: 'Media deleted successfully' });
});
