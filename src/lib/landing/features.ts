export type LandingFeature = {
  id: string;
  title: string;
  description: string;
  /** Replace with real screenshot paths when assets are ready */
  imageSrc?: string | null;
};

export const landingFeatures: LandingFeature[] = [
  {
    id: "kanban",
    title: "Drag-and-Drop Board",
    description:
      "Prioritise your week — move tasks between To-Do, In Progress, and Done without leaving one view.",
    imageSrc: "/features/drag-and-drop.svg",
  },
  {
    id: "calendar",
    title: "Calendar View",
    description:
      "Scan the full month at a glance — see every deadline laid out so you can plan ahead without juggling multiple apps.",
    imageSrc: "/features/calendar.svg",
  },
  {
    id: "focus",
    title: "Focus View",
    description:
      "Cut through the noise and see only what needs action today — no distractions, no scrolling through the whole semester.",
    imageSrc: "/features/focus-view.svg",
  },
  {
    id: "tappers",
    title: "Tappers",
    description:
      "Link with classmates so one person can add word-of-mouth tasks for the block. Shared custom tasks appear in everyone’s feed — adopt them into your own board in one tap.",
    imageSrc: "/features/tappers.svg",
  },
  {
    id: "remind-them",
    title: "Remind them",
    description:
      "Turn your week into a shareable image in seconds — pick a layout, send it to the group chat, and make sure no one in the block misses a deadline.",
    imageSrc: "/features/remind-them.svg",
  },
  {
    id: "reminders",
    title: "Deadline Reminders",
    description:
      "Get push notifications when something is due within 24 hours so nothing slips through during crunch week.",
    imageSrc: "/features/deadline-reminders.svg",
  },
];
