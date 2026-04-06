import express from "express";
import { createEvaluationRoutes } from "./routes/evaluationRoutes";
import { EvaluationService } from "./services/evaluationService";

const app = express();
app.use(express.json());

const service = new EvaluationService();

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "evaluator",
    version: "0.1.0",
    checkedAt: new Date().toISOString(),
  });
});

app.use("/api/evaluations", createEvaluationRoutes(service));

const port = Number(process.env.PORT ?? 4030);
app.listen(port, () => {
  console.log(`evaluator listening on ${port}`);
});
