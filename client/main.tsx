import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DateTime } from "luxon";
import "./styles.css";

const queryClient = new QueryClient();
let csrf = "";
async function api(url: string, method = "GET", body?: unknown, key?: string) {
  const response = await fetch("/api" + url, {
    method,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrf,
      ...(key ? { "idempotency-key": key } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}
const refresh = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ["workspace"] }),
    queryClient.invalidateQueries({ queryKey: ["me"] }),
  ]);
type Entity = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  duration?: number;
  price?: number;
  color?: string;
  assignments?: { serviceId: string }[];
  hours?: { weekday: number; startMinute: number; endMinute: number }[];
  timeOff?: { id: string; startAt: string; endAt: string; reason: string }[];
};
type Appointment = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  price: number;
  notes: string;
  customer: Entity;
  staff: Entity;
  service: Entity;
};
type Workspace = {
  customers: Entity[];
  services: Entity[];
  staff: Entity[];
  appointments: Appointment[];
  audits: { id: string; action: string; createdAt: string; actor: string }[];
};
type Business = {
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  services: Entity[];
  staff: Entity[];
};
const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value / 100,
  );
const date = (value: string, zone: string, format = "ccc, LLL d · h:mm a") =>
  DateTime.fromISO(value).setZone(zone).toFormat(format);
function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark">b</span>bookflow
      <span className="logo-dot">.</span>
    </span>
  );
}
function Message({ error }: { error: string }) {
  return error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <span>✧</span>
      <p>{children}</p>
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {React.Children.map(children, (child, index) =>
        index === 0 && React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ id: string }>, {
              id,
            })
          : child,
      )}
    </div>
  );
}
export function Auth() {
  const [mode, setMode] = React.useState<
    "login" | "register" | "forgot" | "reset"
  >(location.pathname === "/reset" ? "reset" : "login");
  const [error, setError] = React.useState(""),
    [message, setMessage] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const navigate = useNavigate();
  const schema = z.object({
    email: z.string(),
    password: z.string(),
    name: z.string(),
    businessName: z.string(),
    slug: z.string(),
  });
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      businessName: "",
      slug: "",
    },
  });
  async function submit(values: z.infer<typeof schema>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await api(
        "/auth/" + mode,
        "POST",
        mode === "reset"
          ? {
              token: new URLSearchParams(location.search).get("token"),
              password: values.password,
            }
          : values,
      );
      if (mode === "forgot" || mode === "reset") {
        setMessage(data.message);
        if (mode === "reset") setMode("login");
      } else {
        csrf = data.csrf;
        await refresh();
        navigate("/");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Logo />
        <div>
          <p className="eyebrow">LESS ADMIN. MORE POSSIBILITY.</p>
          <h1>
            Your best work
            <br />
            starts with
            <br />
            <em>a little flow.</em>
          </h1>
          <p>
            Appointments, people, and the details that make your business yours.
            Beautifully in sync.
          </p>
          <div className="story-card">
            <span className="avatar">JL</span>
            <div>
              <strong>A little more room to breathe.</strong>
              <p>One workspace for your whole day.</p>
            </div>
            <span>✧</span>
          </div>
        </div>
        <small>Designed for businesses built around people.</small>
      </section>
      <section className="auth-form">
        <div>
          <p className="eyebrow">YOUR BUSINESS, IN FLOW</p>
          <h2>
            {mode === "login"
              ? "Welcome back."
              : mode === "register"
                ? "Make room for growth."
                : mode === "forgot"
                  ? "Let’s get you back in."
                  : "A fresh start."}
          </h2>
          <p className="muted">
            {mode === "login"
              ? "Sign in to your BookFlow workspace."
              : mode === "register"
                ? "Create your business workspace in a moment."
                : "Securely reset your account password."}
          </p>
          <form onSubmit={handleSubmit(submit)}>
            {mode === "register" && (
              <>
                <Field label="Your name">
                  <input {...register("name")} required />
                </Field>
                <Field label="Business name">
                  <input {...register("businessName")} required />
                </Field>
                <Field label="Booking page slug">
                  <input
                    {...register("slug")}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    placeholder="your-studio"
                    required
                  />
                </Field>
              </>
            )}
            {mode !== "reset" && (
              <Field label="Email address">
                <input
                  {...register("email")}
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field label="Password">
                <input
                  {...register("password")}
                  type="password"
                  minLength={10}
                  maxLength={72}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                />
              </Field>
            )}
            <Message error={error} />
            {message && (
              <p className="success" role="status">
                {message}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "login"
                  ? "Sign in →"
                  : mode === "register"
                    ? "Create workspace →"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"}
            </button>
          </form>
          <div className="auth-links">
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "Create an account" : "Back to sign in"}
            </button>
            {mode === "login" && (
              <button onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
            )}
          </div>
          <div className="demo-note">
            <strong>Explore the demo</strong>
            <p>demo@bookflow.example · BookFlowDemo!2026</p>
            <small>Fictional business and customers.</small>
          </div>
        </div>
      </section>
    </div>
  );
}
function Shell() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api("/me"),
    retry: false,
  });
  const workspace = useQuery<Workspace>({
    queryKey: ["workspace"],
    queryFn: () => api("/workspace"),
    enabled: !!me.data,
  });
  const [booking, setBooking] = React.useState(false),
    [error, setError] = React.useState("");
  if (me.isPending)
    return <div className="loading">Opening your workspace…</div>;
  if (me.isError) return <Auth />;
  csrf = me.data.csrf;
  const b = me.data.business as Business;
  return (
    <div className="app">
      <aside className="sidebar">
        <Logo />
        <div className="business-chip">
          <span className="business-icon">✧</span>
          <div>
            <strong>{b.name}</strong>
            <small>Business workspace</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {[
            ["/", "◫", "Overview"],
            ["/calendar", "▦", "Calendar"],
            ["/customers", "♧", "Customers"],
            ["/services", "◇", "Services"],
            ["/staff", "♙", "Team"],
            ["/settings", "⚙", "Settings"],
          ].map(([url, icon, label]) => (
            <NavLink key={url} to={url} end>
              <span aria-hidden="true">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="booking-promo">
            <span>✧</span>
            <strong>
              Your next booking
              <br />
              starts here.
            </strong>
            <p>
              Share your page. Let clients
              <br />
              find their perfect time.
            </p>
            <a href={"/book/" + b.slug} target="_blank" rel="noreferrer">
              Open booking page ↗
            </a>
          </div>
          <button
            className="profile"
            onClick={async () => {
              try {
                await api("/logout", "POST");
                queryClient.clear();
                csrf = "";
                window.location.assign("/");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <span className="avatar">
              {me.data.name.slice(0, 2).toUpperCase()}
            </span>
            <span>
              <strong>{me.data.name}</strong>
              <small>Sign out</small>
            </span>
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            <span className="online-dot" /> Your business, in flow
          </span>
          <a href={"/book/" + b.slug}>Booking page ↗</a>
        </header>
        <div className="content">
          <Message error={error} />
          {workspace.isPending ? (
            <div className="loading">Gathering your day…</div>
          ) : workspace.isError ? (
            <Message error={workspace.error.message} />
          ) : (
            <Routes>
              <Route
                path="/"
                element={
                  <Overview
                    w={workspace.data!}
                    b={b}
                    onBook={() => setBooking(true)}
                  />
                }
              />
              <Route
                path="/calendar"
                element={
                  <Calendar
                    w={workspace.data!}
                    b={b}
                    onBook={() => setBooking(true)}
                  />
                }
              />
              <Route
                path="/customers"
                element={
                  <Directory kind="customers" w={workspace.data!} b={b} />
                }
              />
              <Route
                path="/services"
                element={
                  <Directory kind="services" w={workspace.data!} b={b} />
                }
              />
              <Route
                path="/staff"
                element={<Directory kind="staff" w={workspace.data!} b={b} />}
              />
              <Route
                path="/settings"
                element={<Settings b={b} w={workspace.data!} />}
              />
              <Route
                path="*"
                element={
                  <Empty>Page not found. Choose a workspace section.</Empty>
                }
              />
            </Routes>
          )}
        </div>
      </main>
      {booking && workspace.data && (
        <Booking b={b} w={workspace.data} close={() => setBooking(false)} />
      )}
    </div>
  );
}
function Heading({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
function Overview({
  w,
  b,
  onBook,
}: {
  w: Workspace;
  b: Business;
  onBook: () => void;
}) {
  const today = DateTime.now().setZone(b.timezone),
    todays = w.appointments.filter((a) =>
      DateTime.fromISO(a.startAt).setZone(b.timezone).hasSame(today, "day"),
    );
  const month = w.appointments.filter((a) =>
    DateTime.fromISO(a.startAt).setZone(b.timezone).hasSame(today, "month"),
  );
  const upcoming = w.appointments
    .filter(
      (a) => a.status === "CONFIRMED" && new Date(a.startAt) >= new Date(),
    )
    .slice(0, 5);
  return (
    <>
      <Heading
        kicker={today.toFormat("cccc, LLLL d, yyyy").toUpperCase()}
        title="A good day starts here."
        description="A little clarity. A lot of possibility. Here’s your business at a glance."
        action={
          <button className="primary" onClick={onBook}>
            ＋ New appointment
          </button>
        }
      />
      <div className="stats">
        {[
          [
            "Today’s appointments",
            String(todays.filter((a) => a.status !== "CANCELLED").length),
            "On your schedule today",
            "▦",
          ],
          [
            "Monthly revenue",
            money(
              month
                .filter((a) => a.status === "COMPLETED")
                .reduce((s, a) => s + a.price, 0),
              b.currency,
            ),
            "From completed appointments",
            "↗",
          ],
          [
            "Customers",
            String(w.customers.length),
            "People who make it possible",
            "♧",
          ],
          [
            "Your team",
            String(w.staff.length),
            "Ready to make great things happen",
            "✧",
          ],
        ].map(([label, value, hint, icon]) => (
          <section className="stat" key={label}>
            <div>
              {label}
              <span>{icon}</span>
            </div>
            <strong>{value}</strong>
            <small>{hint}</small>
          </section>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Coming up next</h2>
              <p className="muted">Good things on the calendar.</p>
            </div>
            <NavLink to="/calendar">View calendar ↗</NavLink>
          </div>
          {upcoming.length ? (
            <AppointmentList appointments={upcoming} b={b} />
          ) : (
            <Empty>
              No upcoming appointments. Make room for your first booking.
            </Empty>
          )}
        </section>
        <section className="flow-card">
          <span className="flow-star">✧</span>
          <p className="eyebrow">A LITTLE LESS BACK-AND-FORTH</p>
          <h2>
            Your door is
            <br />
            always open.
          </h2>
          <p>
            Let clients book their next visit, even when you’re busy doing what
            you love.
          </p>
          <a className="light-button" href={"/book/" + b.slug}>
            Visit your booking page ↗
          </a>
          <div className="flow-art">
            <div />
            <div />
            <div />
          </div>
        </section>
      </div>
      <div className="overview-grid lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Your services</h2>
              <p className="muted">The work you’re known for.</p>
            </div>
            <NavLink to="/services">Manage ↗</NavLink>
          </div>
          {w.services.length ? (
            w.services.slice(0, 4).map((s) => (
              <div className="service-row" key={s.id}>
                <span className="service-icon">◇</span>
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.duration} min session</small>
                </div>
                <strong>{money(s.price!, b.currency)}</strong>
              </div>
            ))
          ) : (
            <Empty>Add a service to start accepting appointments.</Empty>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>In good company</h2>
              <p className="muted">Your people, all in one place.</p>
            </div>
            <NavLink to="/staff">Meet the team ↗</NavLink>
          </div>
          {w.staff.map((s) => (
            <div className="service-row" key={s.id}>
              <span
                className="avatar"
                style={{ background: s.color + "22", color: s.color }}
              >
                {s.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")}
              </span>
              <div>
                <strong>{s.name}</strong>
                <small>
                  {s.assignments?.length} services · {s.hours?.length} working
                  days
                </small>
              </div>
              <span className="tag">Team member</span>
            </div>
          ))}
        </section>
      </div>
      <p className="footer-note">
        A calmer way to run your business. <strong>That’s BookFlow.</strong>
      </p>
    </>
  );
}
function AppointmentList({
  appointments,
  b,
}: {
  appointments: Appointment[];
  b: Business;
}) {
  const [selected, setSelected] = React.useState<Appointment | null>(null);
  return (
    <>
      <div className="appointment-list">
        {appointments.map((a) => (
          <button
            className="appointment-row"
            key={a.id}
            onClick={() => setSelected(a)}
          >
            <div className="appointment-time">
              <strong>{date(a.startAt, b.timezone, "h:mm")}</strong>
              <small>{date(a.startAt, b.timezone, "a · LLL d")}</small>
            </div>
            <span
              className="appointment-bar"
              style={{ background: a.staff.color }}
            />
            <span className="appointment-person">
              <strong>{a.customer.name}</strong>
              <small>
                {a.service.name} · {a.service.duration} min
              </small>
            </span>
            <span className="staff-name">{a.staff.name}</span>
            <span className={"status " + a.status.toLowerCase()}>
              {a.status.replace("_", " ").toLowerCase()}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <AppointmentEditor a={selected} b={b} close={() => setSelected(null)} />
      )}
    </>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={close}>
      <div className="modal-heading">
        <h2>{title}</h2>
        <button aria-label="Close dialog" onClick={close}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
function AppointmentEditor({
  a,
  b,
  close,
}: {
  a: Appointment;
  b: Business;
  close: () => void;
}) {
  const [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  return (
    <Modal title={a.customer.name + " · " + a.service.name} close={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const local = DateTime.fromISO(String(f.get("start")), {
              zone: b.timezone,
            });
            if (
              !local.isValid ||
              local.toFormat("yyyy-MM-dd'T'HH:mm") !== f.get("start")
            )
              throw new Error(
                "This local time does not exist due to daylight saving time.",
              );
            const timeChanged =
              String(f.get("start")) !==
              DateTime.fromISO(a.startAt)
                .setZone(b.timezone)
                .toFormat("yyyy-MM-dd'T'HH:mm");
            await api("/appointments/" + a.id, "PATCH", {
              ...(timeChanged ? { startAt: local.toUTC().toISO() } : {}),
              status: f.get("status"),
              notes: f.get("notes"),
            });
            await refresh();
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">
          {a.staff.name} · {money(a.price, b.currency)}
        </p>
        <Field label={"Appointment time (" + b.timezone + ")"}>
          <input
            type="datetime-local"
            name="start"
            required
            defaultValue={DateTime.fromISO(a.startAt)
              .setZone(b.timezone)
              .toFormat("yyyy-MM-dd'T'HH:mm")}
          />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={a.status}>
            {["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea name="notes" defaultValue={a.notes} />
        </Field>
        <Message error={error} />
        <button className="primary full" disabled={busy}>
          {busy ? "Saving…" : "Save appointment"}
        </button>
      </form>
    </Modal>
  );
}
function Calendar({
  w,
  b,
  onBook,
}: {
  w: Workspace;
  b: Business;
  onBook: () => void;
}) {
  const [mode, setMode] = React.useState("week"),
    [anchor, setAnchor] = React.useState(
      DateTime.now().setZone(b.timezone).toISODate()!,
    );
  const current = DateTime.fromISO(anchor, { zone: b.timezone });
  const start = current.startOf(mode as "day" | "week" | "month"),
    end = current.endOf(mode as "day" | "week" | "month");
  const appointments = w.appointments.filter((a) => {
    const d = DateTime.fromISO(a.startAt);
    return d >= start && d <= end;
  });
  return (
    <>
      <Heading
        kicker="YOUR SCHEDULE"
        title="Make space for what matters."
        description={"Every appointment, in " + b.timezone + "."}
        action={
          <button className="primary" onClick={onBook}>
            ＋ New appointment
          </button>
        }
      />
      <section className="panel">
        <div className="calendar-toolbar">
          <div className="segments">
            {["day", "week", "month"].map((m) => (
              <button
                className={m === mode ? "selected" : ""}
                onClick={() => setMode(m)}
                key={m}
              >
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <div>
            <button
              aria-label="Previous period"
              onClick={() =>
                setAnchor(current.minus({ [mode + "s"]: 1 }).toISODate()!)
              }
            >
              ←
            </button>
            <strong>{current.toFormat("LLLL yyyy")}</strong>
            <button
              aria-label="Next period"
              onClick={() =>
                setAnchor(current.plus({ [mode + "s"]: 1 }).toISODate()!)
              }
            >
              →
            </button>
          </div>
          <input
            aria-label="Calendar date"
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
          />
        </div>
        <div className={"calendar-grid " + mode}>
          {Array.from(
            {
              length:
                mode === "day" ? 1 : mode === "week" ? 7 : current.daysInMonth!,
            },
            (_, i) => start.plus({ days: i }),
          ).map((d) => {
            const items = appointments.filter((a) =>
              DateTime.fromISO(a.startAt).setZone(b.timezone).hasSame(d, "day"),
            );
            return (
              <div
                className={
                  "calendar-day " +
                  (d.hasSame(DateTime.now().setZone(b.timezone), "day")
                    ? "today"
                    : "")
                }
                key={d.toISODate()}
              >
                <div className="day-title">
                  <span>{d.toFormat("ccc")}</span>
                  <strong>{d.day}</strong>
                </div>
                {items.map((a) => (
                  <div
                    className="calendar-event"
                    key={a.id}
                    style={{ borderLeftColor: a.staff.color }}
                  >
                    <strong>{date(a.startAt, b.timezone, "h:mm a")}</strong>
                    <span>{a.customer.name}</span>
                    <small>{a.service.name}</small>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel calendar-details">
        <div className="panel-heading">
          <h2>Appointments in this {mode}</h2>
          <span className="tag">{appointments.length} appointments</span>
        </div>
        {appointments.length ? (
          <AppointmentList appointments={appointments} b={b} />
        ) : (
          <Empty>Your calendar has room for something good.</Empty>
        )}
      </section>
    </>
  );
}
function Directory({
  kind,
  w,
  b,
}: {
  kind: "customers" | "services" | "staff";
  w: Workspace;
  b: Business;
}) {
  const [editing, setEditing] = React.useState<Entity | true | null>(null),
    [search, setSearch] = React.useState(""),
    [detail, setDetail] = React.useState<Entity | null>(null),
    [error, setError] = React.useState("");
  const labels = {
    customers: [
      "CUSTOMER DIRECTORY",
      "People come first.",
      "Your customers and the visits that keep them coming back.",
      "customer",
    ],
    services: [
      "SERVICE CATALOG",
      "The work you love.",
      "Give every service a name, a price, and the time it deserves.",
      "service",
    ],
    staff: [
      "YOUR TEAM",
      "Better, together.",
      "Services, working hours, and a little room to recharge.",
      "team member",
    ],
  }[kind];
  const items = w[kind].filter((item) =>
    (item.name + " " + (item.email || ""))
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        kicker={labels[0]}
        title={labels[1]}
        description={labels[2]}
        action={
          <button className="primary" onClick={() => setEditing(true)}>
            ＋ Add {labels[3]}
          </button>
        }
      />
      <Message error={error} />
      <div className="search-row">
        <input
          placeholder={"Search " + kind + "…"}
          aria-label={"Search " + kind}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="muted">
          {items.length} {kind === "staff" ? "team members" : kind}
        </span>
      </div>
      <div className="entity-grid">
        {items.map((item) => (
          <section className="panel entity-card" key={item.id}>
            <div className="entity-top">
              <span
                className="avatar"
                style={
                  item.color
                    ? { background: item.color + "22", color: item.color }
                    : undefined
                }
              >
                {kind === "services"
                  ? "◇"
                  : item.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
              </span>
              <button
                aria-label={"Edit " + item.name}
                onClick={() => setEditing(item)}
              >
                Edit ↗
              </button>
            </div>
            <h2>{item.name}</h2>
            <p className="muted">
              {kind === "services"
                ? `${item.duration} minutes · ${money(item.price!, b.currency)}`
                : item.email}
            </p>
            {kind === "customers" && (
              <p className="muted">
                {item.phone || "No phone added"} ·{" "}
                {w.appointments.filter((a) => a.customer.id === item.id).length}{" "}
                visits
              </p>
            )}
            {kind === "staff" && (
              <p className="muted">
                {item.assignments?.length} services · {item.hours?.length}{" "}
                working days
              </p>
            )}
            <div className="entity-actions">
              {kind !== "services" && (
                <button onClick={() => setDetail(item)}>
                  {kind === "customers"
                    ? "View history"
                    : "Availability & time off"}{" "}
                  →
                </button>
              )}
              <button
                className="danger-text"
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Delete " +
                        item.name +
                        "? Linked appointments prevent deletion.",
                    )
                  )
                    return;
                  try {
                    await api("/" + kind + "/" + item.id, "DELETE");
                    await refresh();
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </section>
        ))}
      </div>
      {!items.length && (
        <Empty>
          No {kind} found. Add your first {labels[3]} to get started.
        </Empty>
      )}
      {editing && (
        <EntityForm
          kind={kind}
          entity={editing === true ? undefined : editing}
          close={() => setEditing(null)}
        />
      )}{" "}
      {detail && kind === "customers" && (
        <Modal
          title={detail.name + " · Appointment history"}
          close={() => setDetail(null)}
        >
          {w.appointments.some((a) => a.customer.id === detail.id) ? (
            <AppointmentList
              appointments={w.appointments.filter(
                (a) => a.customer.id === detail.id,
              )}
              b={b}
            />
          ) : (
            <Empty>No appointments yet.</Empty>
          )}
        </Modal>
      )}
      {detail && kind === "staff" && (
        <Availability
          staff={w.staff.find((s) => s.id === detail.id)!}
          w={w}
          b={b}
          close={() => setDetail(null)}
        />
      )}
    </>
  );
}
function EntityForm({
  kind,
  entity,
  close,
}: {
  kind: string;
  entity?: Entity;
  close: () => void;
}) {
  const [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  return (
    <Modal
      title={
        (entity ? "Edit" : "Add") +
        " " +
        (kind === "staff" ? "team member" : kind.slice(0, -1))
      }
      close={close}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          const data =
            kind === "services"
              ? {
                  name: f.get("name"),
                  duration: Number(f.get("duration")),
                  price: Math.round(Number(f.get("price")) * 100),
                }
              : kind === "staff"
                ? {
                    name: f.get("name"),
                    email: f.get("email"),
                    color: f.get("color"),
                  }
                : {
                    name: f.get("name"),
                    email: f.get("email"),
                    phone: f.get("phone"),
                    notes: f.get("notes"),
                  };
          try {
            await api(
              "/" + kind + (entity ? "/" + entity.id : ""),
              entity ? "PUT" : "POST",
              data,
            );
            await refresh();
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Name">
          <input
            name="name"
            defaultValue={entity?.name}
            required
            maxLength={120}
          />
        </Field>
        {kind === "services" ? (
          <>
            <Field label="Duration (minutes)">
              <input
                name="duration"
                type="number"
                min="5"
                max="480"
                defaultValue={entity?.duration || 60}
                required
              />
            </Field>
            <Field label="Price">
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                defaultValue={(entity?.price || 0) / 100}
                required
              />
            </Field>
          </>
        ) : (
          <Field label="Email">
            <input
              name="email"
              type="email"
              defaultValue={entity?.email}
              required
            />
          </Field>
        )}
        {kind === "customers" && (
          <>
            <Field label="Phone">
              <input name="phone" defaultValue={entity?.phone} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" defaultValue={entity?.notes} />
            </Field>
          </>
        )}
        {kind === "staff" && (
          <Field label="Calendar color">
            <input
              name="color"
              type="color"
              defaultValue={entity?.color || "#7468df"}
            />
          </Field>
        )}
        <Message error={error} />
        <button className="primary full" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>
    </Modal>
  );
}
function Availability({
  staff,
  w,
  b,
  close,
}: {
  staff: Entity;
  w: Workspace;
  b: Business;
  close: () => void;
}) {
  const [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  const minutes = (t: FormDataEntryValue | null) => {
    const [h, m] = String(t).split(":").map(Number);
    return h * 60 + m;
  };
  const time = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  return (
    <Modal title={staff.name + " · Availability"} close={close}>
      <p className="muted">Working hours in {b.timezone}.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await api("/staff/" + staff.id + "/availability", "PUT", {
              serviceIds: f.getAll("services"),
              hours: Array.from({ length: 7 }, (_, i) => i + 1)
                .filter((d) => f.get("day" + d))
                .map((d) => ({
                  weekday: d,
                  startMinute: minutes(f.get("start" + d)),
                  endMinute: minutes(f.get("end" + d)),
                })),
            });
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Services offered</h3>
        {w.services.map((s) => (
          <label className="checkbox" key={s.id}>
            <input
              type="checkbox"
              name="services"
              value={s.id}
              defaultChecked={staff.assignments?.some(
                (a) => a.serviceId === s.id,
              )}
            />
            {s.name}
          </label>
        ))}
        <h3>Weekly hours</h3>
        {[
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].map((d, i) => {
          const h = staff.hours?.find((x) => x.weekday === i + 1);
          return (
            <div className="hours-row" key={d}>
              <label className="checkbox">
                <input
                  name={"day" + (i + 1)}
                  type="checkbox"
                  defaultChecked={!!h}
                />
                {d}
              </label>
              <input
                aria-label={d + " start"}
                type="time"
                name={"start" + (i + 1)}
                defaultValue={time(h?.startMinute || 540)}
              />
              <input
                aria-label={d + " end"}
                type="time"
                name={"end" + (i + 1)}
                defaultValue={time(h?.endMinute || 1020)}
              />
            </div>
          );
        })}
        <button className="primary full" disabled={busy}>
          {busy ? "Saving…" : "Save availability"}
        </button>
      </form>
      <h3>Time off</h3>
      {staff.timeOff?.map((t) => (
        <div className="time-off" key={t.id}>
          <span>
            {t.reason}
            <small>
              {date(t.startAt, b.timezone)} – {date(t.endAt, b.timezone)}
            </small>
          </span>
          <button
            onClick={async () => {
              try {
                await api("/time-off/" + t.id, "DELETE");
                await refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await api("/staff/" + staff.id + "/time-off", "POST", {
              reason: f.get("reason"),
              startAt: DateTime.fromISO(String(f.get("start")), {
                zone: b.timezone,
              })
                .toUTC()
                .toISO(),
              endAt: DateTime.fromISO(String(f.get("end")), {
                zone: b.timezone,
              })
                .toUTC()
                .toISO(),
            });
            await refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Field label="Reason">
          <input name="reason" required />
        </Field>
        <div className="form-grid">
          <Field label="From">
            <input name="start" type="datetime-local" required />
          </Field>
          <Field label="Until">
            <input name="end" type="datetime-local" required />
          </Field>
        </div>
        <button className="secondary full">Add time off</button>
      </form>
      <Message error={error} />
    </Modal>
  );
}
function Booking({
  b,
  w,
  close,
  publicMode = false,
}: {
  b: Business;
  w: Pick<Workspace, "services" | "staff" | "customers">;
  close: () => void;
  publicMode?: boolean;
}) {
  const [serviceId, setService] = React.useState(w.services[0]?.id || ""),
    [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false),
    [result, setResult] = React.useState<any>(null);
  const request = React.useRef<{ payload: string; key: string } | null>(null);
  const form = (
    <>
      {result ? (
        <div className="booking-success">
          <span>✓</span>
          <h2>You’re on the calendar.</h2>
          <p>{date(result.startAt, b.timezone)}</p>
          <p className="muted">{b.timezone} · Reservation confirmed</p>
          <small>Reference: {result.id}</small>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            const local = DateTime.fromISO(String(f.get("start")), {
              zone: b.timezone,
            });
            if (local.toFormat("yyyy-MM-dd'T'HH:mm") !== f.get("start")) {
              setError(
                "This local time does not exist due to daylight saving time.",
              );
              setBusy(false);
              return;
            }
            const body = {
              serviceId,
              staffId: f.get("staffId"),
              startAt: local.toUTC().toISO(),
              notes: f.get("notes") || "",
              ...(publicMode
                ? {
                    customer: {
                      name: f.get("name"),
                      email: f.get("email"),
                      phone: f.get("phone") || "",
                    },
                  }
                : { customerId: f.get("customerId") }),
            };
            const payload = JSON.stringify(body);
            if (request.current?.payload !== payload)
              request.current = { payload, key: crypto.randomUUID() };
            try {
              const r = await api(
                publicMode ? "/public/" + b.slug + "/book" : "/appointments",
                "POST",
                body,
                request.current!.key,
              );
              setResult(r);
              if (!publicMode) {
                await refresh();
                close();
              }
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Choose a service">
            <select
              value={serviceId}
              onChange={(e) => setService(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a service
              </option>
              {w.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.duration} min · {money(s.price!, b.currency)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Team member">
            <select name="staffId" required key={serviceId}>
              <option value="">Choose a team member</option>
              {w.staff
                .filter((s) =>
                  s.assignments?.some((a) => a.serviceId === serviceId),
                )
                .map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label={"Date & time (" + b.timezone + ")"}>
            <input
              name="start"
              type="datetime-local"
              required
              step="900"
              min={DateTime.now()
                .setZone(b.timezone)
                .startOf("day")
                .toFormat("yyyy-MM-dd'T'HH:mm")}
            />
          </Field>
          <p className="muted small">
            Times are checked against working hours and existing bookings.
          </p>
          {publicMode ? (
            <>
              <Field label="Your name">
                <input
                  name="name"
                  required
                  autoComplete="name"
                  maxLength={120}
                />
              </Field>
              <Field label="Email address">
                <input
                  name="email"
                  required
                  type="email"
                  autoComplete="email"
                />
              </Field>
              <Field label="Phone (optional)">
                <input name="phone" autoComplete="tel" />
              </Field>
            </>
          ) : (
            <Field label="Customer">
              <select name="customerId" required>
                <option value="">Choose a customer</option>
                {w.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Notes (optional)">
            <textarea name="notes" maxLength={2000} />
          </Field>
          <Message error={error} />
          <button className="primary full" disabled={busy || !serviceId}>
            {busy ? "Confirming…" : "Confirm appointment →"}
          </button>
        </form>
      )}
    </>
  );
  return publicMode ? (
    form
  ) : (
    <Modal title="A new appointment." close={close}>
      {form}
    </Modal>
  );
}
function PublicBooking() {
  const { slug } = useParams();
  const data = useQuery<Business>({
    queryKey: ["public", slug],
    queryFn: () => api("/public/" + slug),
    retry: false,
  });
  return (
    <div className="public-page">
      <header>
        <a href="/">
          <Logo />
        </a>
        <span>Good things begin with a booking.</span>
      </header>
      {data.isPending ? (
        <div className="loading">Opening booking page…</div>
      ) : data.isError ? (
        <Message error={data.error.message} />
      ) : (
        <div className="public-grid">
          <section>
            <p className="eyebrow">A MOMENT, JUST FOR YOU</p>
            <h1>
              Welcome to
              <br />
              <em>{data.data.name}.</em>
            </h1>
            <p>
              Find your service. Choose your person.
              <br />
              Make a little time for yourself.
            </p>
            <div className="public-details">
              <span>◇ Thoughtful services</span>
              <span>◷ {data.data.timezone}</span>
              <span>✓ Instant reservation</span>
            </div>
          </section>
          <section className="panel public-form">
            <h2>Let’s find your next visit.</h2>
            <p className="muted">
              Reserve your appointment in a few simple steps.
            </p>
            <Booking
              b={data.data}
              w={{
                services: data.data.services,
                staff: data.data.staff,
                customers: [],
              }}
              close={() => {}}
              publicMode
            />
          </section>
        </div>
      )}
      <p className="footer-note">
        Powered by BookFlow · Made for people-first businesses
      </p>
    </div>
  );
}
function Settings({ b, w }: { b: Business; w: Workspace }) {
  const [error, setError] = React.useState(""),
    [saved, setSaved] = React.useState(false);
  return (
    <>
      <Heading
        kicker="BUSINESS SETTINGS"
        title="Make yourself at home."
        description="The details that keep your workspace in sync."
      />
      <div className="settings-grid">
        <section className="panel settings-form">
          <h2>Your business</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaved(false);
              const f = new FormData(e.currentTarget);
              try {
                await api("/settings", "PUT", Object.fromEntries(f));
                await refresh();
                setSaved(true);
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Field label="Business name">
              <input name="name" defaultValue={b.name} required />
            </Field>
            <Field label="Timezone">
              <input
                name="timezone"
                defaultValue={b.timezone}
                required
                list="zones"
              />
              <datalist id="zones">
                {[
                  "America/New_York",
                  "America/Los_Angeles",
                  "America/Argentina/Buenos_Aires",
                  "Europe/London",
                  "Europe/Madrid",
                  "UTC",
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </datalist>
            </Field>
            <Field label="Currency">
              <select name="currency" defaultValue={b.currency}>
                {["USD", "EUR", "GBP", "ARS", "CAD", "AUD"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <p className="muted small">
              Changing timezone affects future working-hour checks. Existing
              appointments retain their UTC times.
            </p>
            <Message error={error} />
            {saved && (
              <p className="success" role="status">
                Settings saved.
              </p>
            )}
            <button className="primary">Save settings</button>
          </form>
          <hr />
          <h3>Public booking page</h3>
          <a href={"/book/" + b.slug}>
            {location.origin}/book/{b.slug} ↗
          </a>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Activity log</h2>
            <span className="tag">Latest 100 events</span>
          </div>
          {w.audits.length ? (
            w.audits.map((a) => (
              <div className="audit-row" key={a.id}>
                <span className="audit-dot" />
                <div>
                  <strong>{a.action.replaceAll("_", " ").toLowerCase()}</strong>
                  <small>
                    {date(a.createdAt, b.timezone)} ·{" "}
                    {a.actor === "PUBLIC" ? "Public booking" : "Workspace user"}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <Empty>Your business activity will appear here.</Empty>
          )}
        </section>
      </div>
    </>
  );
}
const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/book/:slug" element={<PublicBooking />} />
            <Route path="/reset" element={<Auth />} />
            <Route path="*" element={<Shell />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>,
  );
