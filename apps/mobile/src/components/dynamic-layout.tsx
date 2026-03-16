import React from "react";
import { router } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Badge, Button, Card, SectionHeader } from "@/components/ui";
import { COLORS, RADIUS, SPACING } from "@/theme";

type LayoutItem = {
  id: string;
  sectionKey: string;
  slotKey?: string | null;
  positionIndex: number;
  component: {
    componentKey: string;
    componentType: string;
    displayName: string;
    dataSourceKey?: string | null;
    props?: Record<string, any>;
  };
};

type LayoutResponse = {
  source?: string;
  layout?: Record<string, any>;
  sections?: Record<string, LayoutItem[]>;
  tabNavigation?: Array<Record<string, any>>;
};

type TabItem = {
  label?: string;
  route?: string;
  badge?: string;
};

function navigateTo(route?: string) {
  if (!route) return;
  router.push(route as never);
}

function AccentCard({ title, subtitle, onPress, accent = COLORS.primary }: { title: string; subtitle?: string; onPress?: () => void; accent?: string }) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.85 : 1} onPress={onPress}>
      <Card style={{ borderLeftWidth: 4, borderLeftColor: accent }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text }}>{title}</Text>
        {subtitle ? <Text style={{ marginTop: 6, color: COLORS.textSecondary }}>{subtitle}</Text> : null}
      </Card>
    </TouchableOpacity>
  );
}

function renderBanner(item: LayoutItem) {
  const props = item.component.props ?? {};
  return (
    <TouchableOpacity key={item.id} activeOpacity={0.9} onPress={() => navigateTo(props.ctaRoute)}>
      <View
        style={{
          backgroundColor: "#10172B",
          borderRadius: RADIUS.xl,
          padding: SPACING.lg,
          marginBottom: SPACING.lg,
          borderWidth: 1,
          borderColor: "rgba(108,92,231,0.18)",
        }}
      >
        {props.eyebrow ? <Text style={{ color: "#98A9FF", fontWeight: "700", marginBottom: 8 }}>{String(props.eyebrow).toUpperCase()}</Text> : null}
        <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "800", lineHeight: 32 }}>{props.title ?? item.component.displayName}</Text>
        {props.subtitle ? <Text style={{ color: "rgba(255,255,255,0.72)", marginTop: 10, lineHeight: 20 }}>{props.subtitle}</Text> : null}
        {props.ctaLabel ? (
          <View style={{ marginTop: SPACING.md, alignSelf: "flex-start", backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.full }}>
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>{props.ctaLabel}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function renderCta(item: LayoutItem) {
  const props = item.component.props ?? {};
  const buttons = Array.isArray(props.buttons) ? props.buttons : [];
  return (
    <View key={item.id} style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.lg }}>
      {buttons.map((button: any) => (
        <TouchableOpacity
          key={`${item.id}-${button.label}`}
          onPress={() => navigateTo(button.route)}
          style={{
            width: "48%",
            backgroundColor: COLORS.card,
            borderRadius: RADIUS.lg,
            padding: SPACING.md,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 26 }}>{button.icon ?? "•"}</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text, marginTop: 8 }}>{button.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function renderCardList(item: LayoutItem) {
  const props = item.component.props ?? {};
  const cards = Array.isArray(props.cards) ? props.cards : [];
  return (
    <View key={item.id}>
      {props.title ? <SectionHeader title={props.title} /> : null}
      {cards.map((card: any, index: number) => (
        <AccentCard
          key={`${item.id}-${index}`}
          title={card.title ?? "Card"}
          subtitle={card.subtitle}
          accent={card.accent === "success" ? COLORS.success : COLORS.primary}
          onPress={() => navigateTo(card.route)}
        />
      ))}
    </View>
  );
}

function renderCarousel(item: LayoutItem) {
  const props = item.component.props ?? {};
  const entries = Array.isArray(props.items) ? props.items : [];
  return (
    <View key={item.id} style={{ marginBottom: SPACING.lg }}>
      {props.title ? <SectionHeader title={props.title} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {entries.map((entry: any, index: number) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              onPress={() => navigateTo(entry.route)}
              style={{ width: 240, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border }}
            >
              <Badge text={entry.badge ?? "Promo"} color={COLORS.primary} />
              <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text, marginTop: 10 }}>{entry.title ?? "Untitled"}</Text>
              {entry.subtitle ? <Text style={{ color: COLORS.textSecondary, marginTop: 6 }}>{entry.subtitle}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function renderAnnouncement(item: LayoutItem) {
  const props = item.component.props ?? {};
  return <AccentCard key={item.id} title={props.title ?? item.component.displayName} subtitle={props.subtitle} onPress={() => navigateTo(props.route)} accent={COLORS.warning} />;
}

function renderTabs(item: LayoutItem) {
  const props = item.component.props ?? {};
  const tabs = Array.isArray(props.tabs) ? props.tabs as TabItem[] : [];
  return (
    <View key={item.id} style={{ marginBottom: SPACING.lg }}>
      {props.title ? <SectionHeader title={props.title} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: SPACING.sm }}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={`${item.id}-${index}`}
              onPress={() => navigateTo(tab.route)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: COLORS.card,
                borderRadius: RADIUS.full,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ color: COLORS.text, fontWeight: "700" }}>{tab.label ?? `Tab ${index + 1}`}</Text>
              {tab.badge ? <Text style={{ color: COLORS.textSecondary, marginTop: 4, fontSize: 12 }}>{tab.badge}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function renderFloatingAction(item: LayoutItem) {
  const props = item.component.props ?? {};
  return (
    <TouchableOpacity
      key={item.id}
      onPress={() => navigateTo(props.route)}
      style={{
        alignSelf: "flex-end",
        marginBottom: SPACING.lg,
        backgroundColor: props.color ?? COLORS.primary,
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: RADIUS.full,
      }}
    >
      <Text style={{ color: COLORS.white, fontWeight: "700" }}>{props.label ?? item.component.displayName}</Text>
    </TouchableOpacity>
  );
}

function renderSectionItem(item: LayoutItem) {
  switch (item.component.componentType) {
    case "BANNER":
      return renderBanner(item);
    case "CTA":
    case "GRID":
      return renderCta(item);
    case "CARD_LIST":
      return renderCardList(item);
    case "CAROUSEL":
      return renderCarousel(item);
    case "ANNOUNCEMENT":
      return renderAnnouncement(item);
    case "TABS":
      return renderTabs(item);
    case "FLOATING_ACTION":
      return renderFloatingAction(item);
    default:
      return <AccentCard key={item.id} title={item.component.displayName} subtitle="Unsupported dynamic component type" />;
  }
}

export function DynamicHomeLayout({ config }: { config?: LayoutResponse | null }) {
  const sections = config?.sections ?? {};
  const sectionOrder = Object.keys(sections);

  return (
    <>
      {sectionOrder.map((sectionKey) => (
        <View key={sectionKey}>
          {sections[sectionKey]?.sort((left, right) => left.positionIndex - right.positionIndex).map(renderSectionItem)}
        </View>
      ))}
      {sectionOrder.length === 0 ? (
        <Card>
          <Text style={{ color: COLORS.textSecondary }}>Home sections are being refreshed. Browse live rooms and discovery in the meantime.</Text>
        </Card>
      ) : null}
    </>
  );
}