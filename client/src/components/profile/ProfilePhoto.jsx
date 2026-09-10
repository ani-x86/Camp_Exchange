import { useState, useRef } from 'react';

/**
 * ProfilePhoto — circular avatar with optimistic preview and file upload.
 *
 * Cloudinary note (architecture.md §2.5 / rules.md rule 2):
 * Public display photos belong to the public `campx/profile_photos` folder,
 * strictly separate from the private authenticated `campx/id_cards/private` folder.
 *
 * Props:
 *  - initialUrl   (string?)  Current profile image URL
 *  - name         (string)   User full name for accessible alt & fallback initials
 *  - onPhotoChange (fn?)     Callback when photo URL successfully updates
 */
export default function ProfilePhoto({
  initialUrl = null,
  name = 'Student',
  onPhotoChange,
}) {
  const [photoUrl, setPhotoUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const getInitials = (str) => {
    if (!str) return 'U';
    const parts = str.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSelectClick = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectClick();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5MB.');
      return;
    }

    setUploadError(null);
    const previousPhoto = photoUrl;

    // 1. Optimistic preview immediately
    const previewUrl = URL.createObjectURL(file);
    setPhotoUrl(previewUrl);
    setUploading(true);

    try {
      // 2. Background upload to Cloudinary public folder:
      // In production Phase 2: formData.append('file', file); formData.append('upload_preset', 'campx_profile_photos');
      // POST to https://api.cloudinary.com/v1_1/<cloud_name>/image/upload
      // Here we simulate the network roundtrip:
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 800);
        // Clean up object URL once handled
        return () => clearTimeout(timer);
      });

      // Notify parent of updated photo
      onPhotoChange?.(previewUrl);
      setUploading(false);
    } catch {
      // Revert to previous photo on failure, inline error without blocking page
      setPhotoUrl(previousPhoto);
      setUploadError('Photo upload failed. Reverted to previous image.');
      setUploading(false);
    } finally {
      // Reset input value so re-selecting same file fires onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelectClick}
        onKeyDown={handleKeyDown}
        aria-label="Change profile photo"
        className="
          group relative h-20 w-20 sm:h-22 sm:w-22 rounded-full cursor-pointer shrink-0
          border border-clay bg-bone overflow-hidden
          transition-[border-color] duration-120 ease-out
          hover:border-moss focus-visible:outline-2 focus-visible:outline-moss focus-visible:outline-offset-2
        "
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-clay/20 font-heading text-2xl font-bold text-ink/70 select-none">
            {getInitials(name)}
          </div>
        )}

        {/* Hover / Tap overlay with subtle camera icon */}
        <div
          className="
            absolute inset-0 flex flex-col items-center justify-center
            bg-ink/50 opacity-0 text-bone
            transition-opacity duration-120 ease-out
            group-hover:opacity-100
          "
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="mt-1 text-[10px] font-sans font-medium text-bone/90 select-none">
            {uploading ? 'Uploading…' : 'Change'}
          </span>
        </div>

        {/* Uploading spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bone/70">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-clay border-t-moss" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      <span className="mt-1.5 text-[11px] text-ink/50 select-none">
        Click to change photo
      </span>

      {/* Inline non-blocking error */}
      {uploadError && (
        <p className="mt-1 text-center font-sans text-xs text-rust animate-fade-in">
          {uploadError}
        </p>
      )}
    </div>
  );
}
