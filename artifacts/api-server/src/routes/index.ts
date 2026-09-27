import { Router, type IRouter } from "express";
import healthRouter from "./health";
import campusRouter from "./campus";
import assistantRouter from "./assistant";

const router: IRouter = Router();

router.use(healthRouter);
router.use(campusRouter);
router.use(assistantRouter);

export default router;
