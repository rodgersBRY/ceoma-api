import { Request, Response } from "express";

import { ApiError } from "../../common/errors/ApiError.js";
import { parseListQuery } from "../../common/pagination.js";
import { internalService } from "./internal.service.js";
import {
  addOrgNoteSchema,
  createOrgSchema,
  superAdminLoginSchema,
  updateOrgStatusSchema,
  updatePlanSchema,
  updateTrialSchema,
} from "./internal.validation.js";

function parseOrgId(rawValue: string | string[] | undefined): string {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new ApiError(400, "orgId must be a valid UUID");
  }

  return value;
}

export class InternalController {
  async login(req: Request, res: Response): Promise<void> {
    const payload = superAdminLoginSchema.parse(req.body);

    const result = await internalService.login(payload);

    res.json(result);
  }

  async me(req: Request, res: Response): Promise<void> {
    if (!req.superAdmin) {
      throw new ApiError(401, "Super admin authentication required");
    }

    res.json({ admin: req.superAdmin });
  }

  async listOrganizations(req: Request, res: Response): Promise<void> {
    const query = parseListQuery(req.query as Record<string, unknown>, {
      allowedSortBy: [
        "created_at",
        "name",
        "plan",
        "status",
        "users",
        "active_lots",
        "id",
      ],
      defaultSortBy: "created_at",
    });

    const data = await internalService.listOrganizations(query);

    res.json(data);
  }

  async getOrganization(req: Request, res: Response): Promise<void> {
    const orgId = parseOrgId(req.params.orgId);

    const data = await internalService.getOrganization(orgId);

    res.json(data);
  }

  async createOrganization(req: Request, res: Response): Promise<void> {
    if (!req.superAdmin) {
      throw new ApiError(401, "Super admin authentication required");
    }

    const payload = createOrgSchema.parse(req.body);

    const created = await internalService.createOrganization({
      ...payload,
      onboarded_by: req.superAdmin.id,
    });

    res.status(201).json(created);
  }

  async updatePlan(req: Request, res: Response): Promise<void> {
    const orgId = parseOrgId(req.params.orgId);
    const payload = updatePlanSchema.parse(req.body);

    const updated = await internalService.updatePlan(orgId, payload);

    res.json(updated);
  }

  async extendTrial(req: Request, res: Response): Promise<void> {
    const orgId = parseOrgId(req.params.orgId);
    const payload = updateTrialSchema.parse(req.body);

    const updated = await internalService.extendTrial(orgId, payload);

    res.json(updated);
  }

  async updateOrgStatus(req: Request, res: Response): Promise<void> {
    const orgId = parseOrgId(req.params.orgId);
    const payload = updateOrgStatusSchema.parse(req.body);

    const updated = await internalService.updateOrganizationStatus(
      orgId,
      payload.status,
    );

    res.json(updated);
  }

  async addOrgNote(req: Request, res: Response): Promise<void> {
    if (!req.superAdmin) {
      throw new ApiError(401, "Super admin authentication required");
    }

    const orgId = parseOrgId(req.params.orgId);
    const payload = addOrgNoteSchema.parse(req.body);

    const note = await internalService.addNote(
      orgId,
      req.superAdmin.id,
      payload.note,
    );

    res.status(201).json(note);
  }

  async impersonate(req: Request, res: Response): Promise<void> {
    if (!req.superAdmin) {
      throw new ApiError(401, "Super admin authentication required");
    }

    const orgId = parseOrgId(req.params.orgId);

    const token = await internalService.impersonate(orgId, req.superAdmin.id);

    res.json(token);
  }

  async getRevenue(req: Request, res: Response): Promise<void> {
    const data = await internalService.getRevenue();
    
    res.json(data);
  }

  async getAlerts(req: Request, res: Response): Promise<void> {
    const data = await internalService.getAlerts();

    res.json(data);
  }
}

export const internalController = new InternalController();
