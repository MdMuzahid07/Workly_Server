# Notifications (In-app + Realtime)

This project supports **in-app notifications** for **Job Seeker**, **Employer**, and **Admin** users. Notifications are stored in Postgres (via Prisma) and delivered in realtime via **Socket.IO**.

---

## Data model (Prisma)

The core table is `notifications` (model: `Notification`) with:

- `userId`: owner of the notification (the user who will see it)
- `type`: enum `NotificationType` (e.g. `APPLICATION_STATUS_CHANGE`, `MESSAGE_RECEIVED`, …)
- `title`, `message`
- `isRead`
- optional links: `jobId`, `applicationId`
- `metadata`: JSON for extra UI context
- timestamps: `createdAt`

---

## REST API (server)

Base path: `GET/POST ... /api/v1/notification/*`

All endpoints require auth (`Authorization: <token>`), and allow roles:
`JOB_SEEKER`, `EMPLOYER`, `ADMIN`, `SUPER_ADMIN`.

### List my notifications

`GET /notification/my`

Query params (optional):

- `page` (default `1`)
- `limit` (default `20`)
- `sortBy` (default `createdAt`)
- `sortOrder` (`asc|desc`, default `desc`)
- `type` (string)
- `isRead` (`true|false`)

Response:

- `data`: `Notification[]`
- `meta`: pagination object

### Unread count

`GET /notification/unread-count`

Response:

- `data.unreadCount`: number

### Mark one as read

`PATCH /notification/:id/read`

### Mark all as read

`PATCH /notification/mark-all-read`

### Delete

`DELETE /notification/:id`

---

## Realtime (Socket.IO)

### Server

Socket server is initialized in `src/server.ts` via:

- `initSocket(server)` from `src/socket/index.ts`

Auth:

- client sends JWT token via `socket.handshake.auth.token` (preferred) OR `Authorization` header
- server verifies JWT and reads `userId`

Rooms:

- each socket joins `user:<userId>`

Events:

- `notification:new` — emitted to `user:<userId>` whenever a notification is created.

Creation point:

- `notificationService.createNotification()` creates the DB row and calls:
  - `emitToUser(userId, "notification:new", createdNotification)`

### Client

`SocketProvider` (in `Workly_client/src/provider/SocketProvider.tsx`) connects once after login:

- connects to `NEXT_PUBLIC_BACKEND_URL` (or `http://localhost:5000`)
- sends JWT token in `auth.token`
- listens for `notification:new`
- on event, invalidates RTK Query tag `notifications` so:
  - dropdown badge updates
  - lists refresh automatically

---

## How to create notifications from other modules

Use the service method:

- `notificationService.createNotification({ userId, type, title, message, jobId?, applicationId?, metadata? })`

This guarantees:

- DB is updated
- realtime event is emitted to the correct user room

---

## Suggested next improvements (optional)

- Add server-side rate limiting / batching for noisy events.
- Add “deliveredAt/readAt” timestamps if needed (currently UI uses `isRead`).
- Add an admin broadcast endpoint for `SYSTEM_ANNOUNCEMENT`.
