# Hostel Desk: guest portal + admin portal in one app (HTML + CSS + JavaScript)

Open `index.html` in your browser. No install, no server, no database.
One sign-in page serves everyone. Pick the tab, then sign in.

## Sign in
- Staff & admin tab: first run is username `admin`, password `admin123`. Change it right away.
- Guest tab: guests use the login created for them at check-in.
- Try the guest side quickly: in Admin or Overview click "Load demo data", then sign in on the Guest tab as `aman` / `guest123`.

## Three roles
- Guest: sees their own room, roommates (first names), stay dates, and can report problems and track them
  (Received > In progress > Resolved). Can only report during their stay.
- Staff (front desk): overview, rooms, check-in/out, residents, complaints, create or reset guest logins.
- Admin: everything staff can do, plus the Admin portal and deleting rooms and complaints.

## Guest logins
When checking someone in, leave "Create a guest portal login" ticked. The app shows a username and a
temporary password once (with a Copy button). The guest is asked to change it after signing in.
For existing guests use Residents > Create login / Reset login.

## Admin portal
Reports, Staff accounts, Rooms (edit/delete), Activity log, Data & settings (rename hostel, backup/restore, CSV export, erase data).

## Important
Everything runs in the browser and is stored in that browser's localStorage, so guests can only sign in
on the same computer/browser where the data lives. The sign-in is not real security. For a real hostel
where guests use their own phones, you need a server version (for example PHP + MySQL).
Download a backup regularly from Admin > Data & settings.

## Files
index.html, css/style.css, js/app.js
