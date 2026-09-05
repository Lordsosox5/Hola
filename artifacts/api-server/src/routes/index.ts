import { Router, type IRouter } from "express";
import healthRouter from "./health";
import paymentSubmissionsRouter from "./payment-submissions";
import driversRouter from "./drivers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(paymentSubmissionsRouter);
router.use(driversRouter);

export default router;
