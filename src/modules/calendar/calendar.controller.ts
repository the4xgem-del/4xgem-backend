import { Request, Response } from "express";
import { calendarService } from "./calendar.service";
import type { ListEventsQuery, CreateEventInput } from "./calendar.schema";

export const calendarController = {
 async list(req: Request, res: Response) {
  console.log("CONTROLLER HIT");

  const events = await calendarService.list(
    req.query as unknown as ListEventsQuery
  );

  res.json(events);
},

  async create(req: Request, res: Response) {
    res.json({ success: true });
  },
};
