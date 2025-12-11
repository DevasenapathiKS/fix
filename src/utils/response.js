export const successResponse = (res, { status = 200, message = 'Success', data = {} }) => {
  return res.status(status).json({ success: true, message, data });
};

export const errorResponse = (res, { status = 500, message = 'Something went wrong', errors = [] }) => {
  return res.status(status).json({ success: false, message, errors });
};
