import axios from "axios";
import type { ListEventsQuery, CreateEventInput } from "./calendar.schema";

const API_KEY = process.env.FMP_API_KEY;

export const calendarService = {
  async list(query: ListEventsQuery) {
    const today = new Date().toISOString().split("T")[0];

    const { data } = await axios.get(
      "https://financialmodelingprep.com/stable/economic-calendar",
      {
        params: {
          from: today,
          to: today,
          apikey: API_KEY,
        },
      }
    );

    return data;
  },

  async create(input: CreateEventInput) {
    throw new Error("Not supported");
  },
};