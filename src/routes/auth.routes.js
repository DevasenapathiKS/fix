import { Router } from 'express';
import { body } from 'express-validator';
import { login } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { USER_ROLES } from '../constants/index.js';

const router = Router();

router.post(
  '/login',
  validate([
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6 }),
    body('role').isIn(Object.values(USER_ROLES))
  ]),
  login
);

export default router;
