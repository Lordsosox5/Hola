import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, driversTable } from "@workspace/db";
import {
  CreateAdminDriverBody,
  CreateAdminDriverResponse,
  DeleteAdminDriverParams,
  DeleteAdminDriverResponse,
  ListAdminDriversResponse,
  UpdateAdminDriverBody,
  UpdateAdminDriverParams,
  UpdateAdminDriverResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/drivers", async (_req, res): Promise<void> => {
  const drivers = await db
    .select()
    .from(driversTable)
    .orderBy(desc(driversTable.createdAt));
  res.json(ListAdminDriversResponse.parse(drivers));
});

router.post("/admin/drivers", async (req, res): Promise<void> => {
  const parsed = CreateAdminDriverBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid driver payload");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [driver] = await db
    .insert(driversTable)
    .values({
      ...parsed.data,
      status: "active",
    })
    .returning();
  res.status(201).json(CreateAdminDriverResponse.parse(driver));
});

router.patch("/admin/drivers/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminDriverParams.safeParse(req.params);
  const body = UpdateAdminDriverBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({
      error: !params.success ? params.error.message : body.error.message,
    });
    return;
  }

  const [driver] = await db
    .update(driversTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(driversTable.id, params.data.id))
    .returning();
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.json(UpdateAdminDriverResponse.parse(driver));
});

router.delete("/admin/drivers/:id", async (req, res): Promise<void> => {
  const parsed = DeleteAdminDriverParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [driver] = await db
    .delete(driversTable)
    .where(eq(driversTable.id, parsed.data.id))
    .returning();
  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  res.json(DeleteAdminDriverResponse.parse(driver));
});

export default router;