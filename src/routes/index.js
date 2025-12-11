import { Router } from 'express';
import authRoutes from './auth.routes.js';
import orderRoutes from './order.routes.js';
import adminRoutes from './admin.routes.js';
import technicianRoutes from './technician.routes.js';
import paymentRoutes from './payment.routes.js';
import customerRoutes from './customer.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/admin', adminRoutes);
router.use('/technician', technicianRoutes);
router.use('/payments', paymentRoutes);
router.use('/customer', customerRoutes);

export default router;
