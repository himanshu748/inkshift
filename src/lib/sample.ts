import type { DraftPlan, EventRecord } from "./model";
import { eventToDraft } from "./model";

export const emptyEvidence = {
  text: "",
  box: [0, 0, 0, 0] as [number, number, number, number],
};
export function sampleDraft(
  date = "2026-09-27",
  timeZone = "Asia/Kolkata",
): DraftPlan {
  return {
    title: "Sunday games club",
    date,
    timeZone,
    complete: true,
    uncertainties: [],
    spaces: [
      {
        key: "a",
        existingId: null,
        label: "Table A",
        capacity: 4,
        removed: false,
        evidence: { text: "Table A · 4 seats", box: [0.09, 0.27, 0.24, 0.31] },
      },
      {
        key: "b",
        existingId: null,
        label: "Table B",
        capacity: 4,
        removed: false,
        evidence: { text: "Table B · 4 seats", box: [0.38, 0.27, 0.24, 0.31] },
      },
      {
        key: "c",
        existingId: null,
        label: "Table C",
        capacity: 6,
        removed: false,
        evidence: { text: "Table C · 6 seats", box: [0.67, 0.27, 0.24, 0.31] },
      },
    ],
    sessions: [
      {
        key: "s1",
        existingId: null,
        title: "Catan",
        spaceKey: "a",
        start: "18:00",
        end: "19:30",
        capacity: 4,
        removed: false,
        evidence: {
          text: "Catan · 6–7:30 PM · 4 players",
          box: [0.09, 0.41, 0.24, 0.13],
        },
      },
      {
        key: "s2",
        existingId: null,
        title: "Ticket to Ride",
        spaceKey: "b",
        start: "18:00",
        end: "19:30",
        capacity: 4,
        removed: false,
        evidence: {
          text: "Ticket to Ride · 6–7:30 PM · 4 players",
          box: [0.38, 0.41, 0.24, 0.13],
        },
      },
      {
        key: "s3",
        existingId: null,
        title: "Wavelength",
        spaceKey: "c",
        start: "19:30",
        end: "20:30",
        capacity: 6,
        removed: false,
        evidence: {
          text: "Wavelength · 7:30–8:30 PM · 6 players",
          box: [0.67, 0.41, 0.24, 0.13],
        },
      },
    ],
  };
}
export function sampleEdit(
  event: EventRecord,
  change: "remove-table" | "capacity" | "rename",
): DraftPlan {
  const draft = eventToDraft(event);
  const b = draft.spaces.find((s) => s.label === "Table B");
  const ride = draft.sessions.find((s) => s.title === "Ticket to Ride");
  if (change === "remove-table" && b) b.removed = true;
  if (change === "capacity" && ride) ride.capacity = 1;
  if (change === "rename" && ride) ride.title = "Ticket to Ride: Europe";
  return draft;
}
