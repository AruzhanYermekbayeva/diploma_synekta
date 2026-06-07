import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Search, LayoutDashboard, Zap, Bell, UserCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useState, useEffect, useRef } from "react"

/**
 * SynapseKZ — Navbar
 *
 * Design system: "serious infrastructure", light.
 *   Base   : warm stone  #F5F2ED
 *   Surface: #FFFFFF
 *   Ink    : #1A1714
 *   Accent : deep teal #0F6E56
 *   Line   : #E4DFD5
 *
 * All logic (realtime subscription, notification loading, outside-click,
 * timeAgo, role-based nav, logout) is unchanged.
 */

const C = {
  surface: "#FFFFFF",
  surfaceSoft: "#FBFAF7",
  ink: "#1A1714",
  inkSoft: "#3D3833",
  accent: "#0F6E56",
  accentSoft: "#E1EFEA",
  accentText: "#0B5642",
  line: "#E4DFD5",
  lineSoft: "#EFEBE3",
  muted: "#8A8378",
}

interface Notification {
  id: string
  kind: "collab" | "investment" | "talent"
  from_startup: string          // display name of whoever initiated
  label: string                 // e.g. "wants to connect" / "is interested in investing" / "wants to work with you"
  navTo: string                 // route to open when clicked
  message: string | null
  created_at: string
  read: boolean
}

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()

  const [userRole, setUserRole]           = useState<string>("")
  const [userId, setUserId]               = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showBell, setShowBell]           = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // ── Load user ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserRole(user.user_metadata?.role || "founder")
    })
  }, [])

  // ── Load existing pending requests from all three sources ──
  useEffect(() => {
    if (!userId) return

    const loadNotifications = async () => {
      const collected: Notification[] = []

      // My startups (for collaboration + investment requests addressed to them)
      const { data: myStartups } = await supabase
        .from("startups")
        .select("id, name")
        .eq("created_by", userId)
      const myStartupIds = (myStartups ?? []).map(s => s.id)

      // My talent profile (for talent requests addressed to it)
      const { data: myProfile } = await supabase
        .from("talent_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle()

      // 1. collaboration_requests → my startups
      if (myStartupIds.length) {
        const { data: collab } = await supabase
          .from("collaboration_requests")
          .select("id, to_startup_id, message, created_at, startups!from_startup_id(name)")
          .in("to_startup_id", myStartupIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20)
        for (const r of collab ?? []) {
          collected.push({
            id: r.id, kind: "collab",
            from_startup: (r.startups as any)?.name ?? "A startup",
            label: "wants to connect",
            navTo: `/manage/${r.to_startup_id}`,
            message: r.message, created_at: r.created_at, read: false,
          })
        }

        // 2. investment_requests → my startups
        const { data: invest } = await supabase
          .from("investment_requests")
          .select("id, to_startup_id, message, created_at, type")
          .in("to_startup_id", myStartupIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20)
        for (const r of invest ?? []) {
          collected.push({
            id: r.id, kind: "investment",
            from_startup: "An investor",
            label: r.type === "mentorship" ? "offers mentorship" : "is interested in investing",
            navTo: `/manage/${r.to_startup_id}`,
            message: r.message, created_at: r.created_at, read: false,
          })
        }
      }

      // 3. talent_requests → my talent profile
      if (myProfile?.id) {
        const { data: talent } = await supabase
          .from("talent_requests")
          .select("id, message, created_at, startups!from_startup_id(name)")
          .eq("to_talent_profile_id", myProfile.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20)
        for (const r of talent ?? []) {
          collected.push({
            id: r.id, kind: "talent",
            from_startup: (r.startups as any)?.name ?? "A startup",
            label: "wants to work with you",
            navTo: `/talent-profile`,
            message: r.message, created_at: r.created_at, read: false,
          })
        }
      }

      // newest first across all sources
      collected.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      setNotifications(collected)
    }

    loadNotifications()
  }, [userId])

  // ── Realtime subscription (collaboration + investment + talent) ──
  useEffect(() => {
    if (!userId) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    const setup = async () => {
      const { data: myStartups } = await supabase
        .from("startups").select("id").eq("created_by", userId)
      const myStartupIds = (myStartups ?? []).map(s => s.id)

      const { data: myProfile } = await supabase
        .from("talent_profiles").select("id").eq("user_id", userId).maybeSingle()
      const myProfileId = myProfile?.id ?? null

      channel = supabase.channel("notifications-" + userId)

      // 1. collaboration_requests → my startups
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "collaboration_requests" },
        async (payload) => {
          const req = payload.new as any
          if (!myStartupIds.includes(req.to_startup_id)) return
          const { data: from } = await supabase
            .from("startups").select("name").eq("id", req.from_startup_id).single()
          setNotifications(prev => [{
            id: req.id, kind: "collab",
            from_startup: from?.name ?? "A startup",
            label: "wants to connect",
            navTo: `/manage/${req.to_startup_id}`,
            message: req.message, created_at: req.created_at, read: false,
          }, ...prev])
        }
      )

      // 2. investment_requests → my startups
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "investment_requests" },
        (payload) => {
          const req = payload.new as any
          if (!myStartupIds.includes(req.to_startup_id)) return
          setNotifications(prev => [{
            id: req.id, kind: "investment",
            from_startup: "An investor",
            label: req.type === "mentorship" ? "offers mentorship" : "is interested in investing",
            navTo: `/manage/${req.to_startup_id}`,
            message: req.message, created_at: req.created_at, read: false,
          }, ...prev])
        }
      )

      // 3. talent_requests → my talent profile
      if (myProfileId) {
        channel.on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "talent_requests" },
          async (payload) => {
            const req = payload.new as any
            if (req.to_talent_profile_id !== myProfileId) return
            const { data: from } = await supabase
              .from("startups").select("name").eq("id", req.from_startup_id).single()
            setNotifications(prev => [{
              id: req.id, kind: "talent",
              from_startup: from?.name ?? "A startup",
              label: "wants to work with you",
              navTo: `/talent-profile`,
              message: req.message, created_at: req.created_at, read: false,
            }, ...prev])
          }
        )
      }

      channel.subscribe()
    }

    setup()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [userId])

  // ── Close dropdown on outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const handleBellClick = () => {
    setShowBell(v => !v)
    if (!showBell) markAllRead()
  }

  const handleNotifClick = (n: Notification) => {
    navigate(n.navTo)
    setShowBell(false)
  }

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)  return "just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)  return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const navItems = [
    { name: "Discover",  href: "/discover",  icon: Search },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ...(userRole === "talent"
      ? [{ name: "My Profile", href: "/talent-profile", icon: UserCircle }]
      : []),
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <nav
      className="sticky top-0 z-50 w-full backdrop-blur-md"
      style={{
        borderBottom: `1px solid ${C.line}`,
        background: "rgba(245,242,237,0.82)",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        .syn-display { font-family: 'Space Grotesk', system-ui, sans-serif; }
        .syn-mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes dropIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      <div className="container mx-auto flex h-16 items-center justify-between px-4">

        {/* Left — logo + nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="group flex items-center gap-2.5 no-underline">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-md transition-transform group-hover:scale-105"
              style={{ background: C.accent }}
            >
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="syn-display text-lg font-bold tracking-tight" style={{ color: C.ink }}>
              SynapseKZ
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href
              return (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant="ghost"
                    className="gap-2 rounded-md px-4 text-sm transition-all"
                    style={isActive
                      ? { background: C.accentSoft, color: C.accentText, fontWeight: 600 }
                      : { color: C.muted }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right — bell + profile + logout */}
        <div className="flex items-center gap-1">

          {/* Bell */}
          <div ref={bellRef} className="relative">
            <Button
              variant="ghost" size="icon"
              onClick={handleBellClick}
              className="relative rounded-md"
              style={{ color: C.inkSoft }}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full"
                  style={{ background: C.accent, border: `2px solid ${C.surfaceSoft}` }}
                />
              )}
            </Button>

            {showBell && (
              <div
                className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-lg"
                style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 12px 32px rgba(26,23,20,0.12)", animation: "dropIn 0.15s ease" }}
              >
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: C.lineSoft }}>
                  <span className="syn-display text-sm font-semibold" style={{ color: C.ink }}>
                    Notifications
                    {unreadCount > 0 && (
                      <span
                        className="syn-mono ml-2 rounded-md px-1.5 py-0.5 text-[10px]"
                        style={{ background: C.accentSoft, color: C.accentText }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs font-medium transition-opacity hover:opacity-70"
                      style={{ color: C.accent }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="mx-auto mb-2 h-8 w-8" style={{ color: C.line }} />
                      <p className="text-sm" style={{ color: C.muted }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="w-full border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#FBFAF7]"
                        style={{ borderColor: C.lineSoft, background: !n.read ? C.accentSoft : "transparent" }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="syn-display mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                            style={{ background: C.ink }}
                          >
                            {n.from_startup.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-tight" style={{ color: C.inkSoft }}>
                              <span className="font-semibold" style={{ color: C.ink }}>{n.from_startup}</span> {n.label}
                            </p>
                            {n.message && (
                              <p className="mt-0.5 truncate text-xs" style={{ color: C.muted }}>{n.message}</p>
                            )}
                            <p className="syn-mono mt-1 text-[10px]" style={{ color: C.muted }}>{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.read && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: C.accent }} />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile icon */}
          <Button
            variant="ghost" size="icon"
            onClick={() => navigate("/talent-profile")}
            className="rounded-md transition-colors"
            style={{ color: C.inkSoft }}
          >
            <UserCircle className="h-5 w-5" />
          </Button>

          <div className="mx-1 hidden h-5 w-px sm:block" style={{ background: C.line }} />

          <Button
            onClick={handleLogout}
            variant="ghost"
            className="rounded-md text-sm transition-colors hover:text-[#B23B3B]"
            style={{ color: C.muted }}
          >
            Log out
          </Button>
        </div>
      </div>
    </nav>
  )
}
