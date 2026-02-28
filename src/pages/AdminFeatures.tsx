import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Feature {
  id: string;
  feature_name: string;
  description: string | null;
  status: string;
  sort_order: number;
}

const STATUSES = ["Live", "In Development", "Planned", "Removed"];

const AdminFeatures = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ feature_name: "", description: "", status: "Live", sort_order: 100 });

  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ feature_name: "", description: "", status: "Live", sort_order: 100 });

  useEffect(() => {
    async function init() {
      if (!user) return;
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      setIsAdmin(!!data);
      if (data) await loadFeatures();
      setLoading(false);
    }
    init();
  }, [user]);

  async function loadFeatures() {
    const { data } = await supabase.from("features").select("*").order("sort_order");
    if (data) setFeatures(data as Feature[]);
  }

  async function handleSave() {
    if (!editingId) return;
    const { error } = await supabase.from("features")
      .update({ feature_name: editForm.feature_name, description: editForm.description || null, status: editForm.status, sort_order: editForm.sort_order })
      .eq("id", editingId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Feature updated" });
    setEditingId(null);
    await loadFeatures();
  }

  async function handleCreate() {
    if (!newForm.feature_name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const { error } = await supabase.from("features").insert({
      feature_name: newForm.feature_name, description: newForm.description || null, status: newForm.status, sort_order: newForm.sort_order,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Feature added" });
    setShowNew(false);
    setNewForm({ feature_name: "", description: "", status: "Live", sort_order: 100 });
    await loadFeatures();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("features").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Feature removed" });
    await loadFeatures();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-[1100px] px-4 md:px-6 py-16 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground mt-2">You do not have permission to access this page.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-[1100px] px-4 md:px-6 py-6 space-y-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Manage Features</h1>
          <Button onClick={() => setShowNew(true)} disabled={showNew} className="gap-2 h-11 px-4 rounded-md">
            <Plus className="h-4 w-4" /> Add Feature
          </Button>
        </div>

        {showNew && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">New Feature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={newForm.feature_name} onChange={(e) => setNewForm({ ...newForm, feature_name: e.target.value })} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newForm.status} onValueChange={(v) => setNewForm({ ...newForm, status: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2 max-w-[120px]">
                <Label>Sort Order</Label>
                <Input type="number" value={newForm.sort_order} onChange={(e) => setNewForm({ ...newForm, sort_order: Number(e.target.value) })} className="h-11" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreate} className="gap-2 h-11 px-4 rounded-md"><Save className="h-4 w-4" /> Save</Button>
                <Button variant="outline" onClick={() => setShowNew(false)} className="gap-2 h-11 px-4 rounded-md"><X className="h-4 w-4" /> Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Feature</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {features.map((f) => (
                  <TableRow key={f.id}>
                    {editingId === f.id ? (
                      <>
                        <TableCell>
                          <Input type="number" className="w-16 h-11" value={editForm.sort_order} onChange={(e) => setEditForm({ ...editForm, sort_order: Number(e.target.value) })} />
                        </TableCell>
                        <TableCell>
                          <Input value={editForm.feature_name} onChange={(e) => setEditForm({ ...editForm, feature_name: e.target.value })} className="h-11" />
                        </TableCell>
                        <TableCell>
                          <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                            <SelectTrigger className="w-[140px] h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={handleSave}><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-sm text-muted-foreground">{f.sort_order}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{f.feature_name}</div>
                          {f.description && <div className="text-sm text-muted-foreground">{f.description}</div>}
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{f.status}</Badge></TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditingId(f.id); setEditForm({ feature_name: f.feature_name, description: f.description || "", status: f.status, sort_order: f.sort_order }); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(f.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminFeatures;
