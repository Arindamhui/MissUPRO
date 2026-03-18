import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { GradientButton, GlassPanel, HeaderTabs, WinterScreen } from "@/components/me-winter";
import { trpc } from "@/lib/trpc";
import { COLORS } from "@/theme";

const CATEGORIES = ["Top up", "App error", "Suggestion", "Earning Info", "Others"];

export default function FeedbackScreen() {
  const [tab, setTab] = useState("feedback");
  const [category, setCategory] = useState("Top up");
  const [contactType, setContactType] = useState<"Email" | "Telephone">("Email");
  const [contactValue, setContactValue] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");

  const tickets = trpc.support.listMyTickets.useQuery(undefined, { retry: false });
  const uploadImage = trpc.media.uploadAvatar.useMutation();
  const createTicket = trpc.support.createTicket.useMutation({
    onSuccess: () => {
      setDescription("");
      setAttachmentUrl("");
      tickets.refetch();
      Alert.alert("Submitted", "Your feedback has been sent to support.");
    },
    onError: (error: unknown) => Alert.alert("Unable to submit", error instanceof Error ? error.message : "Please try again."),
  });

  const sortedTickets = useMemo(() => ((tickets.data ?? []) as any[]), [tickets.data]);

  const handlePickAttachment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to attach a screenshot.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : (mimeType.split("/")[1] ?? "jpg");

    try {
      const uploaded = await uploadImage.mutateAsync({
        base64Data: asset.base64,
        fileName: asset.fileName?.trim() || `feedback.${extension}`,
        mimeType,
      });
      setAttachmentUrl(String(uploaded.avatarUrl));
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const handleSubmit = () => {
    if (!contactValue.trim() || !description.trim()) {
      Alert.alert("Missing details", "Enter your contact information and explain the issue.");
      return;
    }
    createTicket.mutate({
      category,
      priority: category === "App error" ? "HIGH" : "NORMAL",
      subject: category,
      description,
      metadataJson: {
        contactType,
        contactValue,
        attachmentUrl: attachmentUrl || null,
      },
    });
  };

  return (
    <WinterScreen title="Feedback">
      <HeaderTabs items={[{ key: "feedback", label: "Feedback" }, { key: "mine", label: "My Feedback" }]} activeKey={tab} onChange={setTab} />

      {tab === "feedback" ? (
        <>
          <GlassPanel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {CATEGORIES.map((item) => {
                const active = category === item;
                return (
                  <TouchableOpacity key={item} onPress={() => setCategory(item)} style={{ width: "48%", borderRadius: 14, backgroundColor: active ? "#232B3F" : "#202739", alignItems: "center", paddingVertical: 18, marginBottom: 14, borderBottomWidth: active ? 3 : 0, borderBottomColor: "#5DE2FF" }}>
                    <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </GlassPanel>

          <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 16, marginBottom: 12 }}>Choose your contact information</Text>
          <View style={{ marginBottom: 14 }}>
            {["Email", "Telephone"].map((option) => (
              <TouchableOpacity key={option} onPress={() => setContactType(option as "Email" | "Telephone")} style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: contactType === option ? "#62DEFF" : "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  {contactType === option ? <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#62DEFF" }} /> : null}
                </View>
                <Text style={{ color: COLORS.white, fontSize: 18 }}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ backgroundColor: "#23293A", borderRadius: 12, paddingHorizontal: 16, marginBottom: 14 }}>
            <TextInput value={contactValue} onChangeText={setContactValue} placeholder={contactType === "Email" ? "Enter your Email" : "Enter your telephone"} placeholderTextColor="rgba(255,255,255,0.32)" style={{ color: COLORS.white, fontSize: 16, paddingVertical: 18 }} />
          </View>

          <View style={{ backgroundColor: "#23293A", borderRadius: 12, paddingHorizontal: 16, minHeight: 160 }}>
            <TextInput value={description} onChangeText={setDescription} multiline placeholder="Explain your issue in detail. If it is a bug, please guide us so we will be able to reproduce and test the issue." placeholderTextColor="rgba(255,255,255,0.32)" style={{ color: COLORS.white, fontSize: 16, paddingVertical: 18, minHeight: 160, textAlignVertical: "top" }} />
          </View>

          <Text style={{ color: "rgba(255,255,255,0.68)", fontSize: 16, marginTop: 20, marginBottom: 12 }}>Upload Picture/Video</Text>
          <TouchableOpacity onPress={handlePickAttachment} style={{ borderWidth: 2, borderStyle: "dashed", borderColor: "rgba(255,255,255,0.38)", borderRadius: 18, height: 130, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: 24 }}>
            {attachmentUrl ? <Image source={{ uri: attachmentUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" /> : <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 28 }}>+</Text>}
          </TouchableOpacity>

          <GradientButton title={createTicket.isPending ? "Submitting..." : "Submit"} onPress={handleSubmit} disabled={createTicket.isPending} />
        </>
      ) : (
        <GlassPanel>
          {sortedTickets.length ? sortedTickets.map((ticket: any) => (
            <View key={String(ticket.id)} style={{ borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)", paddingVertical: 14 }}>
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: "700" }}>{String(ticket.subject ?? ticket.category ?? "Feedback")}</Text>
              <Text style={{ color: "rgba(255,255,255,0.64)", marginTop: 4 }}>{String(ticket.status ?? "OPEN")}</Text>
              <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.56)", marginTop: 6 }}>{String(ticket.description ?? "")}</Text>
            </View>
          )) : <Text style={{ color: "rgba(255,255,255,0.68)", textAlign: "center", paddingVertical: 36 }}>No feedback submitted yet.</Text>}
        </GlassPanel>
      )}
    </WinterScreen>
  );
}