import { Router, type IRouter } from "express";
import {
  QueryAssistantBody,
  QueryAssistantResponse,
} from "@workspace/api-zod";
import { getAccessContext } from "../lib/access";
import { resolveAssistantQuery } from "../lib/assistant";
import { syntheticLabel } from "../lib/sqlite";

const router: IRouter = Router();

router.post("/assistant/query", (req, res): void => {
  const parsed = QueryAssistantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const access = getAccessContext(req);
  const response = resolveAssistantQuery(parsed.data.message, access);

  res.json(
    QueryAssistantResponse.parse({
      answer: response.answer,
      intent: response.intent,
      report: response.report,
      matches: response.matches,
      needsClarification: response.needsClarification,
      syntheticLabel,
    }),
  );
});

export default router;