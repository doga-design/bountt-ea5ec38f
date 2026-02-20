import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { User, Session, RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Group, GroupMember, Expense, ExpenseSplit, Profile, AppContextValue, BalanceSummary } from "@/types";
import { generateInviteCode, calculateBalances as calcBalances } from "@/lib/bountt-utils";

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Groups state
  const [currentGroup, setCurrentGroupState] = useState<Group | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  // Members state
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  // Expense splits state
  const [expenseSplits, setExpenseSplits] = useState<ExpenseSplit[]>([]);

  const [error, setError] = useState<string | null>(null);

  // Realtime subscription refs
  const expensesChannelRef = useRef<RealtimeChannel | null>(null);
  const membersChannelRef = useRef<RealtimeChannel | null>(null);

  // Track if we already fetched groups for a given user to avoid double-fetch
  const groupsFetchedForRef = useRef<string | null>(null);

  // =====================================================
  // GROUPS (defined before AUTH so it can be called there)
  // =====================================================
  const fetchGroups = useCallback(async (userId?: string) => {
    const uid = userId ?? user?.id;
    if (!uid) return;
    setGroupsLoading(true);
    setError(null);

    try {
      // Get groups where user is an active member
      const { data: memberRows, error: memberErr } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", uid)
        .eq("status", "active");

      if (memberErr) throw memberErr;

      const groupIds = memberRows?.map((r) => r.group_id) ?? [];

      if (groupIds.length === 0) {
        setUserGroups([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setUserGroups((data as Group[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch groups");
    } finally {
      setGroupsLoading(false);
    }
  }, [user]);

  // =====================================================
  // AUTH
  // =====================================================
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setAuthLoading(false);

        if (newSession?.user) {
          setTimeout(() => fetchProfile(newSession.user.id), 0);
          // Auto-fetch groups on sign-in
          if (groupsFetchedForRef.current !== newSession.user.id) {
            groupsFetchedForRef.current = newSession.user.id;
            setTimeout(() => fetchGroups(newSession.user.id), 0);
          }
        } else {
          setProfile(null);
          setUserGroups([]);
          setCurrentGroupState(null);
          setExpenses([]);
          setGroupMembers([]);
          setGroupsLoading(false);
          groupsFetchedForRef.current = null;
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setAuthLoading(false);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id);
        if (groupsFetchedForRef.current !== initialSession.user.id) {
          groupsFetchedForRef.current = initialSession.user.id;
          fetchGroups(initialSession.user.id);
        }
      } else {
        setGroupsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // =====================================================
  // MORE GROUPS
  // =====================================================
  const createGroup = useCallback(async (name: string, emoji: string): Promise<Group | null> => {
    if (!user) return null;
    setError(null);

    try {
      const inviteCode = generateInviteCode();

      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert({ name, emoji, invite_code: inviteCode, created_by: user.id })
        .select()
        .single();

      if (groupError) throw groupError;

      const group = groupData as Group;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          name: profile?.display_name ?? user.email?.split("@")[0] ?? "You",
          is_placeholder: false,
          role: "admin",
        });

      if (memberError) throw memberError;

      setUserGroups((prev) => [group, ...prev]);
      setCurrentGroupState(group);
      return group;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create group");
      return null;
    }
  }, [user, profile]);

  const setCurrentGroup = useCallback((group: Group | null) => {
    setCurrentGroupState(group);
    if (group) {
      fetchMembers(group.id);
      fetchExpenses(group.id);
      fetchExpenseSplits(group.id);
    } else {
      setGroupMembers([]);
      setExpenses([]);
      setExpenseSplits([]);
    }
  }, []);

  // =====================================================
  // MEMBERS
  // =====================================================
  const fetchMembers = useCallback(async (groupId: string) => {
    setMembersLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId)
        .order("joined_at", { ascending: true });

      if (fetchError) throw fetchError;
      setGroupMembers((data as GroupMember[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch members");
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const addPlaceholderMember = useCallback(async (
    groupId: string,
    name: string
  ): Promise<GroupMember | null> => {
    if (!user) return null;
    try {
      const { data, error: insertError } = await supabase
        .from("group_members")
        .insert({ group_id: groupId, user_id: null, name, is_placeholder: true })
        .select()
        .single();

      if (insertError) throw insertError;
      const member = data as GroupMember;
      setGroupMembers((prev) => [...prev, member]);
      return member;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
      return null;
    }
  }, [user]);

  // =====================================================
  // EXPENSES
  // =====================================================
  const fetchExpenses = useCallback(async (groupId: string) => {
    setExpensesLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("expenses")
        .select("*")
        .eq("group_id", groupId)
        .order("date", { ascending: false });

      if (fetchError) throw fetchError;
      setExpenses((data as Expense[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch expenses");
    } finally {
      setExpensesLoading(false);
    }
  }, []);

  const fetchExpenseSplits = useCallback(async (groupId: string) => {
    try {
      // Get expense IDs for this group first
      const { data: expenseRows } = await supabase
        .from("expenses")
        .select("id")
        .eq("group_id", groupId);

      if (!expenseRows || expenseRows.length === 0) {
        setExpenseSplits([]);
        return;
      }

      const expenseIds = expenseRows.map((e) => e.id);
      const { data, error: fetchError } = await supabase
        .from("expense_splits")
        .select("*")
        .in("expense_id", expenseIds);

      if (fetchError) throw fetchError;
      setExpenseSplits((data as ExpenseSplit[]) ?? []);
    } catch (err) {
      console.error("Failed to fetch expense splits", err);
    }
  }, []);

  const addExpense = useCallback(async (
    expense: Omit<Expense, "id" | "created_at" | "updated_at">
  ): Promise<Expense | null> => {
    if (!user) return null;
    try {
      const { data, error: insertError } = await supabase
        .from("expenses")
        .insert(expense)
        .select()
        .single();

      if (insertError) throw insertError;
      const newExpense = data as Expense;
      setExpenses((prev) => [newExpense, ...prev]);
      return newExpense;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add expense");
      return null;
    }
  }, [user]);

  // =====================================================
  // GROUP MANAGEMENT
  // =====================================================
  const updateGroup = useCallback(async (groupId: string, updates: Partial<Pick<Group, 'name' | 'banner_gradient'>>) => {
    try {
      const { error: updateError } = await supabase
        .from("groups")
        .update(updates)
        .eq("id", groupId);
      if (updateError) throw updateError;
      setUserGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, ...updates } : g));
      if (currentGroup?.id === groupId) {
        setCurrentGroupState((prev) => prev ? { ...prev, ...updates } : prev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update group");
    }
  }, [currentGroup]);

  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      const { error: delError } = await supabase
        .from("groups")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", groupId);
      if (delError) throw delError;
      setUserGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (currentGroup?.id === groupId) {
        setCurrentGroupState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    }
  }, [currentGroup]);

  const removeMember = useCallback(async (memberId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("group_members")
        .update({ status: "left", left_at: new Date().toISOString() })
        .eq("id", memberId);
      if (updateError) throw updateError;
      setGroupMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, status: "left", left_at: new Date().toISOString() } : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }, []);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    try {
      const member = groupMembers.find((m) => m.user_id === user.id && m.group_id === groupId);
      if (!member) return;
      const { error: updateError } = await supabase
        .from("group_members")
        .update({ status: "left", left_at: new Date().toISOString() })
        .eq("id", member.id);
      if (updateError) throw updateError;
      setUserGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (currentGroup?.id === groupId) {
        setCurrentGroupState(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave group");
    }
  }, [user, groupMembers, currentGroup]);
  const calculateBalances = useCallback((): BalanceSummary[] => {
    return calcBalances(expenses);
  }, [expenses]);

  // =====================================================
  // REALTIME SUBSCRIPTIONS
  // =====================================================
  useEffect(() => {
    if (!currentGroup) {
      expensesChannelRef.current?.unsubscribe();
      membersChannelRef.current?.unsubscribe();
      return;
    }

    expensesChannelRef.current = supabase
      .channel(`expenses:${currentGroup.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `group_id=eq.${currentGroup.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setExpenses((prev) => {
              const newExpense = payload.new as Expense;
              if (prev.some((e) => e.id === newExpense.id)) return prev;
              return [newExpense, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setExpenses((prev) =>
              prev.map((e) => (e.id === (payload.new as Expense).id ? (payload.new as Expense) : e))
            );
          } else if (payload.eventType === "DELETE") {
            setExpenses((prev) => prev.filter((e) => e.id !== (payload.old as Expense).id));
          }
        }
      )
      .subscribe();

    membersChannelRef.current = supabase
      .channel(`members:${currentGroup.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${currentGroup.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setGroupMembers((prev) => {
              const newMember = payload.new as GroupMember;
              if (prev.some((m) => m.id === newMember.id)) return prev;
              return [...prev, newMember];
            });
          } else if (payload.eventType === "UPDATE") {
            setGroupMembers((prev) =>
              prev.map((m) => (m.id === (payload.new as GroupMember).id ? (payload.new as GroupMember) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setGroupMembers((prev) => prev.filter((m) => m.id !== (payload.old as GroupMember).id));
          }
        }
      )
      .subscribe();

    return () => {
      expensesChannelRef.current?.unsubscribe();
      membersChannelRef.current?.unsubscribe();
    };
  }, [currentGroup?.id]);

  const value: AppContextValue = {
    user,
    session,
    profile,
    authLoading,
    currentGroup,
    userGroups,
    groupsLoading,
    groupMembers,
    membersLoading,
    expenses,
    expensesLoading,
    expenseSplits,
    error,
    setCurrentGroup,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    fetchMembers,
    addPlaceholderMember,
    removeMember,
    leaveGroup,
    fetchExpenses,
    addExpense,
    fetchExpenseSplits,
    calculateBalances,
    signOut,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export default AppContext;
