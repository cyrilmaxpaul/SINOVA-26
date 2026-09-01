import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Gamepad2, Heart, ImagePlus, Loader2, Sparkles, Target, Trophy, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEvent } from "@/context/EventContext";
import { saveSettings, uploadLogo } from "@/lib/firestore";
import { StatTile } from "@/components/StatTile";
import { TeamColorBadge } from "@/components/TeamColorBadge";
import { EventQRCard } from "@/components/EventQRCard";
import { AppearancePanel } from "@/components/AppearancePanel";
import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { StandingsVisualizer } from "@/components/StandingsVisualizer";
import { TopHackers } from "@/components/TopHackers";
import { StatsSkeleton } from "@/components/Skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const { admin } = useAuth();
  const { teams, employees, guests, results, games, settings, loading } = useEvent();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [eventName, setEventName] = useState(settings.eventName);

  const isSuper = admin?.role === "super";
  const capacity = teams.reduce((s, t) => s + t.maxMembers, 0);
  const totalPoints = teams.reduce((s, t) => s + t.points, 0);

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadLogo(file);
      toast.success("Logo updated");
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save logo. Try a smaller image.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSaveName() {
    try {
      await saveSettings({ eventName: eventName.trim() || "SINOVA'26" });
      toast.success("Event name saved");
    } catch {
      toast.error("Failed to save.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold">
          <Sparkles className="h-6 w-6 text-primary" /> Event Intelligence Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Live overview of participation, scoring, and standings.
        </p>
      </div>

      {loading ? (
        <StatsSkeleton count={5} />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatTile
            label="Participants"
            value={`${employees.length}${capacity ? ` / ${capacity}` : ""}`}
            hint="registered"
            icon={Users}
          />
          <StatTile label="Total Points" value={`${totalPoints}`} hint="pts" icon={Trophy} accent="text-amber-500" />
          <StatTile label="Scored Events" value={results.length} hint="times" icon={Target} accent="text-green-500" />
          <StatTile
            label="Active Games"
            value={games.filter((g) => g.status === "active").length}
            hint={`${games.length} total`}
            icon={Gamepad2}
            accent="text-blue-500"
          />
          <StatTile label="Guests" value={guests.length} hint="checked in" icon={Heart} accent="text-pink-500" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <LiveLeaderboard />
        </div>
        <div className="lg:col-span-2">
          <StandingsVisualizer />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TopHackers limit={10} />
        </div>
        <div className="lg:col-span-2">
          <EventQRCard />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" /> Guests ({guests.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">Family &amp; friends following the event.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {guests.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No guests checked in yet.</p>
          )}
          {[...guests]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/15 text-xs font-bold text-pink-500">
                  {g.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {g.name} <span className="text-xs font-normal text-muted-foreground">· {g.points} pts</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.relationship} of {g.linkedEmployeeName} ({g.linkedEmployeeId})
                  </div>
                </div>
                <TeamColorBadge team={g.team} />
              </div>
            ))}
        </CardContent>
      </Card>

      {isSuper && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-primary" /> Branding
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload a logo shown before the {settings.eventName || "SINOVA'26"} title, and set the event name.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="logo" className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
                  <ImagePlus className="h-6 w-6" />
                </div>
              )}
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogo}
                />
                <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {settings.logoUrl ? "Replace logo" : "Upload logo"}
                </Button>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Event Name</label>
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)} />
              </div>
              <Button onClick={handleSaveName}>Save</Button>
            </div>
          </CardContent>
        </Card>
        <AppearancePanel />
        </div>
      )}
    </div>
  );
}
