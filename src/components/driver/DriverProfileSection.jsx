import { useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

function DriverProfileSection({
  profileInitials,
  profileForm,
  setProfileForm,
  handleProfileSave,
  handleProfileReset,
  profileNotice,
  licenseReminder,
  attachedVehicle,
}) {
  const { t } = useTranslation();
  const requiredProfileFields = [
    profileForm.photoUrl,
    profileForm.name,
    profileForm.email,
    profileForm.phone,
    profileForm.license,
    profileForm.licenseClass,
    profileForm.licenseExpiry,
    profileForm.emergencyContact,
    profileForm.contactAddress,
    profileForm.bio,
  ];
  const completedFieldCount = requiredProfileFields.filter((value) =>
    String(value || "").trim().length > 0
  ).length;
  const completionPercent = Math.round(
    (completedFieldCount / requiredProfileFields.length) * 100
  );
  const profileFields = [
    { key: "photoUrl", label: t("driver.profile.profilePhoto", "Profile photo"), value: profileForm.photoUrl },
    { key: "name", label: t("driver.profile.driverName", "Driver name"), value: profileForm.name },
    { key: "email", label: t("auth.email", "Email"), value: profileForm.email },
    { key: "phone", label: t("driver.profile.phone", "Phone"), value: profileForm.phone },
    { key: "license", label: t("driver.profile.licenseNumber", "License number"), value: profileForm.license },
    { key: "licenseClass", label: t("driver.profile.licenseClass", "License class"), value: profileForm.licenseClass },
    { key: "licenseExpiry", label: t("driver.profile.licenseExpiry", "License expiry"), value: profileForm.licenseExpiry },
    {
      key: "emergencyContact",
      label: t("driver.profile.emergencyContact", "Emergency contact"),
      value: profileForm.emergencyContact,
    },
    { key: "contactAddress", label: t("driver.profile.contactAddress", "Contact address"), value: profileForm.contactAddress },
    { key: "bio", label: t("driver.profile.aboutDriver", "About driver"), value: profileForm.bio },
  ];
  const missingFields = profileFields.filter(
    (field) => String(field.value || "").trim().length === 0
  );
  const completionTone =
    completionPercent >= 90
      ? "bg-emerald-500/20 text-emerald-100 border-emerald-300/70"
      : completionPercent >= 60
      ? "bg-amber-500/20 text-amber-100 border-amber-300/70"
      : "bg-rose-500/20 text-rose-100 border-rose-300/70";
  const completionLabel =
    completionPercent >= 90
      ? t("driver.profile.readyForOperations", "Ready for operations")
      : completionPercent >= 60
      ? t("driver.profile.almostComplete", "Almost complete")
      : t("driver.profile.addMoreProfileDetails", "Add more profile details");

  const [photoFeedback, setPhotoFeedback] = useState("");
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  const updateField = (field, value) =>
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      setPhotoFeedback(t("driver.profile.selectImageFile", "Please select an image file."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoFeedback(t("driver.profile.imageLessThan2Mb", "Image should be less than 2MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) {
        setPhotoFeedback(t("driver.profile.couldNotReadImage", "Could not read image file."));
        return;
      }
      updateField("photoUrl", result);
      setPhotoFeedback(t("driver.profile.photoSelectedSaveProfile", "Profile photo selected. Save profile to keep it."));
    };
    reader.onerror = () => {
      setPhotoFeedback(t("driver.profile.couldNotReadImage", "Could not read image file."));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const removePhoto = () => {
    updateField("photoUrl", "");
    setPhotoFeedback(t("driver.profile.photoRemoved", "Profile photo removed."));
  };

  return (
    <section className="min-w-0 space-y-4 sm:space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-4 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="relative">
              {profileForm.photoUrl ? (
                <div className="size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-white/45 sm:size-12">
                  <img
                    alt="Driver profile"
                    className="h-full w-full object-cover"
                    src={profileForm.photoUrl}
                  />
                </div>
              ) : (
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-semibold text-white sm:size-12 sm:text-sm">
                  {profileInitials}
                </div>
              )}
              <button
                className="absolute -bottom-1 -right-1 inline-flex size-5 items-center justify-center rounded-full border border-white/70 bg-slate-900 text-white shadow-sm transition hover:bg-slate-800"
                onClick={() => setPhotoModalOpen(true)}
                title={t("driver.profile.updateProfilePhoto", "Update profile photo")}
                type="button"
              >
                <Camera className="size-3" />
              </button>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-300 sm:text-xs sm:tracking-[0.2em]">
                {t("driver.profile.driverProfile", "Driver Profile")}
              </p>
              <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
                {profileForm.name || t("driver.profile.addYourProfile", "Add your profile")}
              </h2>
              <p className="text-[11px] text-slate-300 sm:text-xs">
                {t("driver.profile.keepProfileUpdated", "Keep this profile updated for fleet, workshop and support operations.")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-emerald-300/70 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 sm:px-3 sm:text-xs">
              {t("driver.profile.activeDriverAccount", "Active driver account")}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs ${completionTone}`}>
              {completionLabel}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-200">
              <p>{t("driver.profile.profileCompleteness", "Profile completeness")}</p>
              <p className="font-semibold">{completionPercent}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-emerald-300 transition-all"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {missingFields.length > 0 ? (
                missingFields.slice(0, 4).map((field) => (
                  <span
                    className="rounded-full border border-amber-200/60 bg-amber-200/10 px-2.5 py-1 text-[11px] font-semibold text-amber-100"
                    key={field.key}
                  >
                    {t("driver.profile.addField", "Add")} {field.label}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-emerald-200/70 bg-emerald-200/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  {t("driver.profile.allFieldsCompleted", "All profile fields are completed")}
                </span>
              )}
            </div>
          </div>
          {/* <div className="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
            <Button
              className="w-full border-amber-300/80 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20 sm:w-auto"
              onClick={() => setPhotoModalOpen(true)}
              type="button"
              variant="outline"
            >
              <Camera className="mr-2 size-4" />
              {profileForm.photoUrl ? "Change profile photo" : "Add profile photo"}
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleProfileSave} type="button">
              Save profile
            </Button>
            <Button
              className="w-full border-slate-300 bg-white text-slate-900 hover:bg-slate-100 sm:w-auto"
              onClick={handleProfileReset}
              type="button"
              variant="outline"
            >
              Reset
            </Button>
          </div> */}
        </div>
      </div>

      <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4 sm:space-y-6">
          <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{t("driver.profile.driverProfileManagement", "Driver profile management")}</h3>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("driver.profile.driverName", "Driver name")}
                  </p>
                  <Input
                    onChange={(event) => updateField("name", event.target.value)}
                    value={profileForm.name}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </p>
                  <Input
                    onChange={(event) => updateField("email", event.target.value)}
                    value={profileForm.email}
                    disabled
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("driver.profile.aboutDriver", "About driver")}
                  </p>
                  <Textarea
                    className="text-xs sm:text-sm [overflow-wrap:anywhere] break-all"
                    onChange={(event) => updateField("bio", event.target.value)}
                    placeholder={t("driver.profile.shortProfileSummary", "Short profile summary...")}
                    rows={4}
                    value={profileForm.bio}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{t("driver.profile.licenseDetails", "License details")}</h3>
              <div className="mt-4 space-y-3">
                <div className={`rounded-2xl border px-3 py-3 text-xs font-medium ${licenseReminder.tone}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{t("driver.profile.licenseCheckReminder", "License check reminder")}</span>
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-900">
                      {licenseReminder.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700">{licenseReminder.note}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("driver.profile.licenseNumber", "License number")}
                  </p>
                  <Input
                    onChange={(event) => updateField("license", event.target.value)}
                    value={profileForm.license}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("driver.profile.licenseClass", "License class")}
                  </p>
                  <Input
                    onChange={(event) => updateField("licenseClass", event.target.value)}
                    value={profileForm.licenseClass}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("driver.profile.expiryDate", "Expiry date")}
                  </p>
                  <Input
                    onChange={(event) => updateField("licenseExpiry", event.target.value)}
                    type="date"
                    value={profileForm.licenseExpiry}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{t("driver.profile.contactDetails", "Contact details")}</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("driver.profile.phone", "Phone")}</p>
                <Input
                  onChange={(event) => updateField("phone", event.target.value)}
                  value={profileForm.phone}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("driver.profile.emergencyContact", "Emergency contact")}
                </p>
                <Input
                  onChange={(event) => updateField("emergencyContact", event.target.value)}
                  value={profileForm.emergencyContact}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("driver.profile.contactAddress", "Contact address")}
                </p>
                <Input
                  onChange={(event) => updateField("contactAddress", event.target.value)}
                  value={profileForm.contactAddress}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {/* <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Profile setup checklist</h3>
            <p className="mt-1 text-xs text-slate-500">
              Complete all fields so workshop and fleet teams can support you faster.
            </p>
            <div className="mt-4 space-y-2">
              {profileFields.map((field) => {
                const isFilled = String(field.value || "").trim().length > 0;
                return (
                  <div
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    key={field.key}
                  >
                    <p className="text-xs font-semibold text-slate-700">{field.label}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        isFilled
                          ? "bg-emerald-900 text-emerald-100"
                          : "bg-amber-900 text-amber-100"
                      }`}
                    >
                      {isFilled ? "Added" : "Missing"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div> */}

          <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{t("driver.profile.profilePreview", "Profile preview")}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {t("driver.profile.profilePreviewDesc", "This is how your profile will appear in operations.")}
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="relative">
                  {profileForm.photoUrl ? (
                    <div className="size-14 overflow-hidden rounded-full ring-2 ring-slate-300 sm:size-16">
                      <img
                        alt="Driver profile"
                        className="h-full w-full object-cover"
                        src={profileForm.photoUrl}
                      />
                    </div>
                  ) : (
                    <div className="grid size-14 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white sm:size-16 sm:text-sm">
                      {profileInitials}
                    </div>
                  )}
                  <button
                    className="absolute -bottom-1 -right-1 inline-flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 sm:size-7"
                    onClick={() => setPhotoModalOpen(true)}
                    title={t("driver.profile.updateProfilePhoto", "Update profile photo")}
                    type="button"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                    {profileForm.name || t("driver.profile.unnamedDriver", "Unnamed Driver")}
                  </p>
                  <p className="truncate text-[11px] text-slate-600 sm:text-xs">{profileForm.email || t("common.notAvailable", "N/A")}</p>
                  <button
                    className="mt-1 text-[11px] font-semibold text-indigo-700 transition hover:text-indigo-600"
                    onClick={() => setPhotoModalOpen(true)}
                    type="button"
                  >
                    {t("driver.profile.changePhoto", "Change photo")}
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-700">
                <p>
                  {t("driver.profile.license", "License")}:{" "}
                  <span className="font-semibold text-slate-900">
                    {profileForm.license || t("common.notAvailable", "N/A")}
                  </span>
                </p>
                <p>
                  {t("driver.profile.classExpiry", "Class / Expiry")}:{" "}
                  <span className="font-semibold text-slate-900">
                    {profileForm.licenseClass || t("common.notAvailable", "N/A")} /{" "}
                    {profileForm.licenseExpiry || t("common.notAvailable", "N/A")}
                  </span>
                </p>
                <p>
                  {t("driver.profile.attachedVehicle", "Attached vehicle")}:{" "}
                  <span className="font-semibold text-slate-900">
                    {attachedVehicle
                      ? `${attachedVehicle.id} - ${attachedVehicle.model} (${attachedVehicle.plate || t("common.notAvailable", "N/A")})`
                      : t("driver.profile.notAssigned", "Not assigned")}
                  </span>
                </p>
                <p>
                  {t("driver.profile.phone", "Phone")}:{" "}
                  <span className="font-semibold text-slate-900">{profileForm.phone || t("common.notAvailable", "N/A")}</span>
                </p>
                <p>
                  {t("driver.profile.emergency", "Emergency")}:{" "}
                  <span className="font-semibold text-slate-900">
                    {profileForm.emergencyContact || t("common.notAvailable", "N/A")}
                  </span>
                </p>
                <p>
                  {t("driver.profile.address", "Address")}:{" "}
                  <span className="break-words font-semibold text-slate-900">
                    {profileForm.contactAddress || t("common.notAvailable", "N/A")}
                  </span>
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {t("driver.profile.about", "About")}
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  <span className="[overflow-wrap:anywhere] break-all">
                    {profileForm.bio || t("driver.profile.noProfileSummary", "No profile summary added yet.")}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog onOpenChange={setPhotoModalOpen} open={photoModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-slate-200 p-0 sm:max-w-xl">
          <div className="bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-sm text-slate-900 sm:text-base">{t("driver.profile.updateProfilePhoto", "Update Profile Photo")}</DialogTitle>
              <DialogDescription className="text-xs text-slate-600 sm:text-sm">
                {t("driver.profile.uploadClearPhoto", "Upload a clear photo for quick identity confirmation at workshop and fleet desk.")}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 sm:mt-5 sm:p-5">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative">
                  <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-slate-900 text-base font-semibold text-white ring-4 ring-white sm:size-24 sm:text-lg">
                    {profileForm.photoUrl ? (
                      <img
                        alt="Driver profile"
                        className="h-full w-full object-cover"
                        src={profileForm.photoUrl}
                      />
                    ) : (
                      profileInitials
                    )}
                  </div>
                  <span className="absolute -bottom-1 right-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {t("driver.profile.driver", "Driver")}
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                    <ImagePlus className="size-4" />
                    {t("driver.profile.uploadPhoto", "Upload photo")}
                    <input
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      type="file"
                    />
                  </label>
                  {profileForm.photoUrl ? (
                    <button
                      className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 transition hover:text-rose-600"
                      onClick={removePhoto}
                      type="button"
                    >
                      <Trash2 className="size-3.5" />
                      {t("driver.profile.removePhoto", "Remove photo")}
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500">{t("driver.profile.pngJpgMax", "PNG/JPG, max 2MB.")}</p>
                  )}
                </div>
              </div>

              {photoFeedback ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  {photoFeedback}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => {
                    handleProfileSave();
                    setPhotoModalOpen(false);
                  }}
                  type="button"
                >
                  {t("driver.profile.saveClose", "Save & close")}
                </Button>
                <Button className="w-full sm:w-auto" onClick={() => setPhotoModalOpen(false)} type="button" variant="outline">
                  {t("driver.request.close", "Close")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {profileNotice ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-700 sm:text-sm">
          {profileNotice}
        </div>
      ) : null}
    </section>
  );
}

export default DriverProfileSection;
