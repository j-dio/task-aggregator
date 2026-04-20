export interface TapperSummary {
  userId: string
  displayName: string
  linkedAt: string // ISO datetime
}

export interface SharedTaskCard {
  sharedTaskId: string
  taskId: string
  ownerId: string
  ownerDisplayName: string
  recipientId: string
  addedTaskId: string | null   // null = not yet adopted
  seenAt: string | null
  createdAt: string
  // task fields
  title: string
  description: string | null
  dueDate: string | null       // ISO datetime
  type: string
  courseName: string | null
  courseColor: string | null
}

export interface TapperInvite {
  id: string
  code: string
  expiresAt: string
  usedCount: number
  maxUses: number
  createdAt: string
}
