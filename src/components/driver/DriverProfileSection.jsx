import { useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
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
}) {
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
    { key: "photoUrl", label: "Profile photo", value: profileForm.photoUrl },
    { key: "name", label: "Driver name", value: profileForm.name },
    { key: "email", label: "Email", value: profileForm.email },
    { key: "phone", label: "Phone", value: profileForm.phone },
    { key: "license", label: "License number", value: profileForm.license },
    { key: "licenseClass", label: "License class", value: profileForm.licenseClass },
    { key: "licenseExpiry", label: "License expiry", value: profileForm.licenseExpiry },
    {
      key: "emergencyContact",
      label: "Emergency contact",
      value: profileForm.emergencyContact,
    },
    { key: "contactAddress", label: "Contact address", value: profileForm.contactAddress },
    { key: "bio", label: "About driver", value: profileForm.bio },
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
      ? "Ready for operations"
      : completionPercent >= 60
      ? "Almost complete"
      : "Add more profile details";

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
      setPhotoFeedback("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setPhotoFeedback("Image should be less than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) {
        setPhotoFeedback("Could not read image file.");
        return;
      }
      updateField("photoUrl", result);
      setPhotoFeedback("Profile photo selected. Save profile to keep it.");
    };
    reader.onerror = () => {
      setPhotoFeedback("Could not read image file.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const removePhoto = () => {
    updateField("photoUrl", "");
    setPhotoFeedback("Profile photo removed.");
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200/70 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_100%)] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {profileForm.photoUrl ? (
              <div className="size-12 overflow-hidden rounded-full ring-2 ring-white/45">
                <img
                  alt="Driver profile"
                  className="h-full w-full object-cover"
                  src={profileForm.photoUrl}
                />
              </div>
            ) : (
              <div className="grid size-12 place-items-center rounded-full bg-white/15 text-sm font-semibold text-white">
                {profileInitials}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Driver Profile</p>
              <h2 className="text-xl font-semibold text-white">
                {profileForm.name || "Add your profile"}
              </h2>
              <p className="text-xs text-slate-300">
                Keep this profile updated for fleet, workshop and support operations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-300/70 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-100">
              Active driver account
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${completionTone}`}>
              {completionLabel}
            </span>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-200">
              <p>Profile completeness</p>
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
                    Add {field.label}
                  </span>
                ))
              ) : (
                <span className="rounded-full border border-emerald-200/70 bg-emerald-200/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  All profile fields are completed
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2 self-start">
            <Button onClick={handleProfileSave} type="button">
              Save profile
            </Button>
            <Button onClick={handleProfileReset} type="button" variant="outline">
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Driver profile management</h3>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Driver name
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
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    About driver
                  </p>
                  <Textarea
                    onChange={(event) => updateField("bio", event.target.value)}
                    placeholder="Short profile summary..."
                    rows={4}
                    value={profileForm.bio}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">License details</h3>
              <div className="mt-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    License number
                  </p>
                  <Input
                    onChange={(event) => updateField("license", event.target.value)}
                    value={profileForm.license}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    License class
                  </p>
                  <Input
                    onChange={(event) => updateField("licenseClass", event.target.value)}
                    value={profileForm.licenseClass}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Expiry date
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

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Contact details</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
                <Input
                  onChange={(event) => updateField("phone", event.target.value)}
                  value={profileForm.phone}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Emergency contact
                </p>
                <Input
                  onChange={(event) => updateField("emergencyContact", event.target.value)}
                  value={profileForm.emergencyContact}
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contact address
                </p>
                <Input
                  onChange={(event) => updateField("contactAddress", event.target.value)}
                  value={profileForm.contactAddress}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
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

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Profile preview</h3>
            <p className="mt-1 text-xs text-slate-500">
              This is how your profile will appear in operations.
            </p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {profileForm.photoUrl ? (
                    <div className="size-16 overflow-hidden rounded-full ring-2 ring-slate-300">
                      <img
                        alt="Driver profile"
                        className="h-full w-full object-cover"
                        src={profileForm.photoUrl}
                      />
                    </div>
                  ) : (
                    <div className="grid size-16 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {profileInitials}
                    </div>
                  )}
                  <button
                    className="absolute -bottom-1 -right-1 inline-flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white shadow-sm transition hover:bg-slate-800"
                    onClick={() => setPhotoModalOpen(true)}
                    title="Update profile photo"
                    type="button"
                  >
                    <Camera className="size-3.5" />
                  </button>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {profileForm.name || "Unnamed Driver"}
                  </p>
                  <p className="text-xs text-slate-600">{profileForm.email || "N/A"}</p>
                  <button
                    className="mt-1 text-[11px] font-semibold text-indigo-700 transition hover:text-indigo-600"
                    onClick={() => setPhotoModalOpen(true)}
                    type="button"
                  >
                    Change photo
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-xs text-slate-700">
                <p>
                  License:{" "}
                  <span className="font-semibold text-slate-900">
                    {profileForm.license || "N/A"}
                  </span>
                </p>
                <p>
                  Class / Expiry:{" "}
                  <span className="font-semibold text-slate-900">
                    {profileForm.licenseClass || "N/A"} /{" "}
                    {profileForm.licenseExpiry || "N/A"}
                  </span>
                </p>
                <p>
                  Phone:{" "}
                  <span className="font-semibold text-slate-900">{profileForm.phone || "N/A"}</span>
                </p>
                <p>
                  Emergency:{" "}
                  <span className="font-semibold text-slate-900">
                    {profileForm.emergencyContact || "N/A"}
                  </span>
                </p>
                <p>
                  Address:{" "}
                  <span className="font-semibold text-slate-900">
                    {profileForm.contactAddress || "N/A"}
                  </span>
                </p>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  About
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  {profileForm.bio || "No profile summary added yet."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog onOpenChange={setPhotoModalOpen} open={photoModalOpen}>
        <DialogContent className="overflow-hidden border-slate-200 p-0 sm:max-w-xl">
          <div className="bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] p-6">
            <DialogHeader>
              <DialogTitle className="text-slate-900">Update Profile Photo</DialogTitle>
              <DialogDescription className="text-slate-600">
                Upload a clear photo for quick identity confirmation at workshop and fleet desk.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="relative">
                  <div className="grid size-24 place-items-center overflow-hidden rounded-full bg-slate-900 text-lg font-semibold text-white ring-4 ring-white">
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
                    Driver
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
                    <ImagePlus className="size-4" />
                    Upload photo
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
                      Remove photo
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500">PNG/JPG, max 2MB.</p>
                  )}
                </div>
              </div>

              {photoFeedback ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  {photoFeedback}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    handleProfileSave();
                    setPhotoModalOpen(false);
                  }}
                  type="button"
                >
                  Save & close
                </Button>
                <Button onClick={() => setPhotoModalOpen(false)} type="button" variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {profileNotice ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {profileNotice}
        </div>
      ) : null}
    </section>
  );
}

export default DriverProfileSection;
