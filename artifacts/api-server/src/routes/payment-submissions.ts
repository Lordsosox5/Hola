import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, paymentSubmissionsTable } from "@workspace/db";
import {
  ConfirmAdminPaymentSubmissionParams,
  ConfirmAdminPaymentSubmissionResponse,
  GetPaymentSubmissionParams,
  GetPaymentSubmissionResponse,
  ListAdminPaymentSubmissionsQueryParams,
  ListAdminPaymentSubmissionsResponse,
  SubmitPaymentBody,
  SubmitPaymentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/payment-submissions", async (req, res): Promise<void> => {
  const parsed = SubmitPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid payment submission");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [submission] = await db
    .insert(paymentSubmissionsTable)
    .values({
      orderId: parsed.data.orderId,
      paymentMethod: parsed.data.paymentMethod,
      total: parsed.data.total,
      transactionLast4: parsed.data.transactionLast4,
      status: "pending",
    })
    .returning();

  res.status(201).json(SubmitPaymentResponse.parse(submission));
});

router.get("/payment-submissions/:id", async (req, res): Promise<void> => {
  const parsed = GetPaymentSubmissionParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [submission] = await db
    .select()
    .from(paymentSubmissionsTable)
    .where(eq(paymentSubmissionsTable.id, parsed.data.id));

  if (!submission) {
    res.status(404).json({ error: "Payment submission not found" });
    return;
  }

  res.json(GetPaymentSubmissionResponse.parse(submission));
});

router.get("/admin/payment-submissions", async (req, res): Promise<void> => {
  const parsed = ListAdminPaymentSubmissionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const submissions =
    parsed.data.status === "all"
      ? await db
          .select()
          .from(paymentSubmissionsTable)
          .orderBy(desc(paymentSubmissionsTable.createdAt))
      : await db
          .select()
          .from(paymentSubmissionsTable)
          .where(eq(paymentSubmissionsTable.status, parsed.data.status))
          .orderBy(desc(paymentSubmissionsTable.createdAt));

  res.json(ListAdminPaymentSubmissionsResponse.parse(submissions));
});

router.post(
  "/admin/payment-submissions/:id/confirm",
  async (req, res): Promise<void> => {
    const parsed = ConfirmAdminPaymentSubmissionParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [submission] = await db
      .update(paymentSubmissionsTable)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(paymentSubmissionsTable.id, parsed.data.id))
      .returning();

    if (!submission) {
      res.status(404).json({ error: "Payment submission not found" });
      return;
    }

    res.json(ConfirmAdminPaymentSubmissionResponse.parse(submission));
  },
);

export default router;