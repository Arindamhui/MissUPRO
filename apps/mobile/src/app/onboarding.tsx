import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Screen, Button, Card, Input, Badge } from "@/components/ui";
import { trpc } from "@/lib/trpc";
import { COLORS, FONT, RADIUS, SPACING } from "@/theme";
import { useAuthStore } from "@/store";

type OnboardingRole = "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY";

const ROLE_OPTIONS: Array<{
  key: OnboardingRole;
  title: string;
  subtitle: string;
  badge: string;
}> = [
  {
    key: "USER",
    title: "User",
    subtitle: "Browse, discover, and engage without creating a model profile.",
    badge: "Mobile User",
  },
  {
    key: "MODEL_INDEPENDENT",
    title: "Independent Model",
    subtitle: "Create your own model profile and operate independently.",
    badge: "Solo Creator",
  },
  {
    key: "MODEL_AGENCY",
    title: "Agency Model",
    subtitle: "Join through an approved agency code and link yourself to that tenant.",
    badge: "Managed Tenant",
  },
];

export default function OnboardingScreen() {
  const setMobilePanel = useAuthStore((state) => state.setMobilePanel);
  const sessionQuery = trpc.auth.getMobileSession.useQuery(undefined, { retry: false });
  const onboardingMutation = trpc.auth.completeMobileOnboarding.useMutation({
    onSuccess: (session) => {
      setMobilePanel(session.panel, session.agencyId ?? null, session.agencyName ?? null);
      router.replace("/(tabs)");
    },
  });

  const [selectedRole, setSelectedRole] = useState<OnboardingRole>("USER");
  const [agencyId, setAgencyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = sessionQuery.data;
    if (!session) return;

    if (session.status !== "needs_onboarding") {
      setMobilePanel(session.panel, session.agencyId ?? null, session.agencyName ?? null);
      router.replace("/(tabs)");
    }
  }, [sessionQuery.data, setMobilePanel]);

  const submit = () => {
    if (selectedRole === "MODEL_AGENCY" && !agencyId.trim()) {
      setError("Agency code is required for agency-based model onboarding.");
      return;
    }

    setError("");
    onboardingMutation.mutate({
      selectedRole,
      agencyId: selectedRole === "MODEL_AGENCY" ? agencyId.trim() : undefined,
    });
  };

  if (sessionQuery.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Screen scroll style={{ padding: SPACING.lg }}>
      <View style={{ marginTop: SPACING.xxl, marginBottom: SPACING.xl }}>
        <Text style={{ color: COLORS.primary, fontSize: FONT.sizes.sm, fontWeight: "700", letterSpacing: 1.4 }}>MISSU PRO</Text>
        <Text style={{ color: COLORS.text, fontSize: FONT.sizes.title, fontWeight: "700", marginTop: SPACING.sm }}>
          Choose your mobile access
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sizes.md, marginTop: SPACING.sm, lineHeight: 22 }}>
          This determines which onboarding path, permissions, and tenant linkage the backend applies to your account.
        </Text>
      </View>

      {ROLE_OPTIONS.map((option) => {
        const active = selectedRole === option.key;
        return (
          <TouchableOpacity key={option.key} activeOpacity={0.9} onPress={() => setSelectedRole(option.key)}>
            <Card style={{
              borderWidth: 1.5,
              borderColor: active ? COLORS.primary : COLORS.border,
              backgroundColor: active ? COLORS.primaryLight : COLORS.card,
            }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: SPACING.sm }}>
                <View style={{ flex: 1, paddingRight: SPACING.md }}>
                  <Text style={{ color: COLORS.text, fontSize: FONT.sizes.lg, fontWeight: "700" }}>{option.title}</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sizes.sm, marginTop: 6, lineHeight: 20 }}>{option.subtitle}</Text>
                </View>
                <Badge label={option.badge} color={active ? COLORS.primaryDark : COLORS.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}

      {selectedRole === "MODEL_AGENCY" ? (
        <Card style={{ borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ color: COLORS.text, fontSize: FONT.sizes.md, fontWeight: "700", marginBottom: SPACING.xs }}>
            Agency code required
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sizes.sm, lineHeight: 20, marginBottom: SPACING.md }}>
            Enter the approved agency code exactly as shared by your agency. Access stays blocked until the tenant is approved.
          </Text>
          <Input
            label="Agency Code"
            placeholder="example-agency-a1b2c3"
            value={agencyId}
            onChangeText={setAgencyId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </Card>
      ) : null}

      {error ? (
        <View style={{ backgroundColor: COLORS.danger + "15", borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md }}>
          <Text style={{ color: COLORS.danger, fontSize: FONT.sizes.sm }}>{error}</Text>
        </View>
      ) : null}

      {onboardingMutation.error ? (
        <View style={{ backgroundColor: COLORS.danger + "15", borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md }}>
          <Text style={{ color: COLORS.danger, fontSize: FONT.sizes.sm }}>
            {String(onboardingMutation.error.message ?? onboardingMutation.error)}
          </Text>
        </View>
      ) : null}

      {selectedRole === "MODEL_AGENCY" ? (
        <View style={{ marginBottom: SPACING.lg }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: FONT.sizes.sm, lineHeight: 20 }}>
            Strict rule: the agency must exist and already be approved. Invalid or pending codes are rejected by the backend.
          </Text>
        </View>
      ) : null}

      <Button
        title={onboardingMutation.isPending ? "Saving access..." : "Continue"}
        onPress={submit}
        loading={onboardingMutation.isPending}
        style={{ marginBottom: SPACING.xl }}
      />
    </Screen>
  );
}