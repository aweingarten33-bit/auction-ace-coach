import { Router, type IRouter } from "express";
import healthRouter from "./health";
import espnRouter from "./espn";

const router: IRouter = Router();

router.use(healthRouter);
router.use(espnRouter);

export default router;
