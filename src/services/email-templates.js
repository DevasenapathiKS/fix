import dayjs from 'dayjs';
import env from '../config/env.js';

const formatDateTime = (date) => {
  if (!date) return 'N/A';
  return dayjs(date).tz(env.timezone).format('DD MMM YYYY, hh:mm A');
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return dayjs(date).tz(env.timezone).format('DD MMM YYYY');
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0.00';
  return `₹${Number(amount).toFixed(2)}`;
};

const baseEmailTemplate = ({ name, title, content, footerNote }) => {
  const safeName = name || 'Valued Customer';
  return `
    <div style="background-color:#f5f5f7;padding:40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table width="100%" cellspacing="0" cellpadding="0" role="presentation">
        <tr>
          <td align="center">
            <table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);" cellspacing="0" cellpadding="0" role="presentation">
              <!-- Header -->
              <tr>
                <td style="padding:24px 32px 16px 32px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg, #1e293b 0%, #334155 100%);">
                  <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">Fixzep</h1>
                  <p style="margin:4px 0 0 0;font-size:13px;color:#cbd5e1;">Smart field service, made simple.</p>
                </td>
              </tr>
              <!-- Title -->
              <tr>
                <td style="padding:32px 32px 8px 32px;">
                  <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;color:#111827;">${title}</h2>
                  <p style="margin:0 0 24px 0;font-size:14px;color:#4b5563;">Hi ${safeName},</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding:0 32px 24px 32px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:24px 32px;border-top:1px solid #e5e7eb;background:#f9fafb;">
                  <p style="margin:0 0 8px 0;font-size:12px;color:#6b7280;">Thanks,</p>
                  <p style="margin:0 0 12px 0;font-size:12px;color:#6b7280;font-weight:600;">The Fixzep Team</p>
                  ${footerNote ? `<p style="margin:0;font-size:11px;color:#9ca3af;">${footerNote}</p>` : ''}
                  <p style="margin:12px 0 0 0;font-size:11px;color:#d1d5db;">This is an automated message, please do not reply.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
};

export const buildOrderConfirmationEmail = ({ order, customerName, customerEmail }) => {
  const serviceName = order.serviceItem?.name || order.services?.[0]?.serviceName || 'Service';
  const scheduledDate = formatDateTime(order.scheduledAt || order.timeWindowStart);
  const address = order.customer
    ? `${order.customer.addressLine1}${order.customer.addressLine2 ? ', ' + order.customer.addressLine2 : ''}, ${order.customer.city}, ${order.customer.state} ${order.customer.postalCode || ''}`
    : 'Address not available';

  const content = `
    <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;line-height:1.6;">
      Thank you for choosing Fixzep! Your service request has been confirmed. We've received your order and our team will get back to you shortly.
    </p>

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#111827;">Order Details</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:40%;">Order Code:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">#${order.orderCode || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Service:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">${serviceName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Scheduled Date:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">${scheduledDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Service Address:</td>
          <td style="padding:8px 0;color:#111827;">${address}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Estimated Cost:</td>
          <td style="padding:8px 0;color:#059669;font-weight:600;">${formatCurrency(order.estimatedCost)}</td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0 0;font-size:14px;color:#4b5563;line-height:1.6;">
      <strong>What's next?</strong><br/>
      Our team will review your request and assign a qualified technician soon. You'll receive another email once a technician has been assigned to your order.
    </p>

    <p style="margin:20px 0 0 0;font-size:13px;color:#6b7280;">
      If you have any questions or need to make changes to your order, please contact our support team.
    </p>
  `;

  const subject = `Order Confirmed - #${order.orderCode || 'N/A'} | Fixzep`;
  const text = `Order Confirmation\n\nHi ${customerName || 'Customer'},\n\nYour order #${order.orderCode || 'N/A'} for ${serviceName} has been confirmed.\n\nScheduled Date: ${scheduledDate}\nService Address: ${address}\nEstimated Cost: ${formatCurrency(order.estimatedCost)}\n\nWe'll notify you once a technician has been assigned.\n\nThanks,\nThe Fixzep Team`;

  return {
    to: customerEmail,
    subject,
    text,
    html: baseEmailTemplate({
      name: customerName,
      title: 'Order Confirmed',
      content,
      footerNote: null
    })
  };
};

export const buildTechnicianAssignedEmail = ({ order, technician, customerName, customerEmail }) => {
  const serviceName = order.serviceItem?.name || order.services?.[0]?.serviceName || 'Service';
  const scheduledDate = formatDateTime(order.scheduledAt || order.timeWindowStart);
  const technicianName = technician?.name || 'Our technician';
  const technicianPhone = technician?.mobile || technician?.phone || 'Contact support';
  const address = order.customer
    ? `${order.customer.addressLine1}${order.customer.addressLine2 ? ', ' + order.customer.addressLine2 : ''}, ${order.customer.city}, ${order.customer.state} ${order.customer.postalCode || ''}`
    : 'Address not available';

  const content = `
    <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;line-height:1.6;">
      Great news! We've assigned a qualified technician to your service request. Your technician will arrive at the scheduled time.
    </p>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#166534;">Technician Assigned</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#166534;width:40%;">Technician Name:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">${technicianName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#166534;">Contact:</td>
          <td style="padding:8px 0;color:#111827;">${technicianPhone}</td>
        </tr>
      </table>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#111827;">Service Details</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:40%;">Order Code:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">#${order.orderCode || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Service:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">${serviceName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Scheduled Date:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">${scheduledDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Service Address:</td>
          <td style="padding:8px 0;color:#111827;">${address}</td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0 0;font-size:14px;color:#4b5563;line-height:1.6;">
      <strong>What to expect:</strong><br/>
      Our technician will arrive within the scheduled time window. You can reach out to them directly using the contact number above if you need to coordinate.
    </p>

    <p style="margin:20px 0 0 0;font-size:13px;color:#6b7280;">
      We're committed to providing you with excellent service. If you have any questions, feel free to contact our support team.
    </p>
  `;

  const subject = `Technician Assigned - #${order.orderCode || 'N/A'} | Fixzep`;
  const text = `Technician Assigned\n\nHi ${customerName || 'Customer'},\n\nA technician has been assigned to your order #${order.orderCode || 'N/A'}.\n\nTechnician: ${technicianName}\nContact: ${technicianPhone}\nScheduled Date: ${scheduledDate}\n\nThanks,\nThe Fixzep Team`;

  return {
    to: customerEmail,
    subject,
    text,
    html: baseEmailTemplate({
      name: customerName,
      title: 'Technician Assigned',
      content,
      footerNote: null
    })
  };
};

export const buildOrderRescheduledEmail = ({ order, newStart, newEnd, customerName, customerEmail, reason }) => {
  const serviceName = order.serviceItem?.name || order.services?.[0]?.serviceName || 'Service';
  const oldDate = formatDateTime(order.scheduledAt || order.timeWindowStart);
  const newDate = formatDateTime(newStart);

  const content = `
    <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;line-height:1.6;">
      Your service appointment has been rescheduled. We apologize for any inconvenience this may cause.
    </p>

    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#92400e;">Schedule Update</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#92400e;width:45%;">Previous Date:</td>
          <td style="padding:8px 0;color:#111827;text-decoration:line-through;">${oldDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#92400e;font-weight:600;">New Date:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;font-size:16px;">${newDate}</td>
        </tr>
        ${reason ? `
        <tr>
          <td style="padding:8px 0;color:#92400e;">Reason:</td>
          <td style="padding:8px 0;color:#111827;">${reason}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#111827;">Order Details</h3>
      <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:40%;">Order Code:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">#${order.orderCode || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Service:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">${serviceName}</td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0 0;font-size:14px;color:#4b5563;line-height:1.6;">
      Please note the new appointment date and time. Our technician will arrive at the rescheduled time. If this new time doesn't work for you, please contact our support team to make alternative arrangements.
    </p>

    <p style="margin:20px 0 0 0;font-size:13px;color:#6b7280;">
      We appreciate your understanding and look forward to serving you.
    </p>
  `;

  const subject = `Order Rescheduled - #${order.orderCode || 'N/A'} | Fixzep`;
  const text = `Order Rescheduled\n\nHi ${customerName || 'Customer'},\n\nYour order #${order.orderCode || 'N/A'} has been rescheduled.\n\nPrevious Date: ${oldDate}\nNew Date: ${newDate}\n${reason ? `Reason: ${reason}\n` : ''}\n\nThanks,\nThe Fixzep Team`;

  return {
    to: customerEmail,
    subject,
    text,
    html: baseEmailTemplate({
      name: customerName,
      title: 'Order Rescheduled',
      content,
      footerNote: null
    })
  };
};

export const buildInvoiceEmail = ({ order, jobCard, payment, customerName, customerEmail }) => {
  const serviceName = order.serviceItem?.name || order.services?.[0]?.serviceName || 'Service';
  const completedDate = formatDate(jobCard?.completedAt || order.completedAt || new Date());
  
  const baseAmount = jobCard?.estimateAmount || order.estimatedCost || 0;
  const additionalCharges = jobCard?.additionalCharges || 0;
  const finalAmount = jobCard?.finalAmount || payment?.amount || baseAmount + additionalCharges;

  const sparePartsRows = (jobCard?.sparePartsUsed || []).map(item => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;">${item.part?.name || 'Spare Part'}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#6b7280;">${item.quantity || 1}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;">${formatCurrency(item.unitPrice || 0)}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:600;">${formatCurrency((item.quantity || 1) * (item.unitPrice || 0))}</td>
    </tr>
  `).join('');

  const extraWorkRows = (jobCard?.extraWork || []).map(item => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;" colspan="2">${item.serviceItem?.name || item.description || 'Additional Service'}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:600;" colspan="2">${formatCurrency(item.amount || 0)}</td>
    </tr>
  `).join('');

  const content = `
    <p style="margin:0 0 20px 0;font-size:14px;color:#4b5563;line-height:1.6;">
      Your service has been completed! Please find the invoice below for your records.
    </p>

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;">
      <h3 style="margin:0 0 20px 0;font-size:18px;font-weight:600;color:#111827;">Invoice</h3>
      
      <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;margin-bottom:20px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:40%;">Invoice Number:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">#${order.orderCode || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Service Date:</td>
          <td style="padding:8px 0;color:#111827;">${completedDate}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Service:</td>
          <td style="padding:8px 0;color:#111827;font-weight:600;">${serviceName}</td>
        </tr>
      </table>

      <table width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px;text-align:left;font-weight:600;color:#111827;border-bottom:2px solid #e5e7eb;">Description</th>
            <th style="padding:12px;text-align:center;font-weight:600;color:#111827;border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="padding:12px;text-align:right;font-weight:600;color:#111827;border-bottom:2px solid #e5e7eb;">Unit Price</th>
            <th style="padding:12px;text-align:right;font-weight:600;color:#111827;border-bottom:2px solid #e5e7eb;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;" colspan="2">${serviceName}</td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280;">-</td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:600;">${formatCurrency(baseAmount)}</td>
          </tr>
          ${sparePartsRows}
          ${extraWorkRows}
          ${additionalCharges > 0 ? `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;" colspan="3" style="text-align:right;font-weight:600;">Subtotal:</td>
            <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#111827;font-weight:600;">${formatCurrency(baseAmount + additionalCharges)}</td>
          </tr>
          ` : ''}
        </tbody>
        <tfoot>
          <tr style="background:#f9fafb;">
            <td style="padding:16px;text-align:right;font-weight:600;color:#111827;font-size:16px;" colspan="3">Total Amount:</td>
            <td style="padding:16px;text-align:right;font-weight:700;color:#059669;font-size:18px;">${formatCurrency(finalAmount)}</td>
          </tr>
          ${payment ? `
          <tr>
            <td style="padding:8px 16px;text-align:right;color:#6b7280;font-size:12px;" colspan="3">Payment Status:</td>
            <td style="padding:8px 16px;text-align:right;color:#059669;font-weight:600;font-size:12px;">${payment.status === 'success' ? 'Paid' : payment.status === 'partial' ? 'Partially Paid' : 'Pending'}</td>
          </tr>
          ` : ''}
        </tfoot>
      </table>
    </div>

    <p style="margin:24px 0 0 0;font-size:14px;color:#4b5563;line-height:1.6;">
      Thank you for choosing Fixzep! We hope you're satisfied with our service. If you have any questions about this invoice, please don't hesitate to contact us.
    </p>

    <p style="margin:20px 0 0 0;font-size:13px;color:#6b7280;">
      This invoice is also available in your account dashboard.
    </p>
  `;

  const subject = `Invoice - #${order.orderCode || 'N/A'} | Fixzep`;
  const text = `Invoice\n\nHi ${customerName || 'Customer'},\n\nPlease find your invoice for order #${order.orderCode || 'N/A'}.\n\nService: ${serviceName}\nTotal Amount: ${formatCurrency(finalAmount)}\n\nThanks,\nThe Fixzep Team`;

  return {
    to: customerEmail,
    subject,
    text,
    html: baseEmailTemplate({
      name: customerName,
      title: 'Invoice',
      content,
      footerNote: 'This is an official invoice document. Please keep it for your records.'
    })
  };
};
