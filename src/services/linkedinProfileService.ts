/**
 * Service to pull live LinkedIn profile picture, name, and headline/description
 * directly from LinkedIn's public profile data with browser CORS support.
 */

export interface LinkedInProfileData {
  name: string;
  headline: string;
  picture: string;
  handle: string;
}

export function sanitizeLinkedInHandle(input: string): string {
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "");
  clean = clean.replace(/\/.*$/, "");
  clean = clean.replace(/\?.*$/, "");
  return clean.trim();
}

export async function fetchLinkedInProfile(input: string): Promise<LinkedInProfileData> {
  const cleanHandle = sanitizeLinkedInHandle(input);
  if (!cleanHandle) {
    throw new Error("Please enter a valid LinkedIn profile username or URL.");
  }

  const profileUrl = `https://www.linkedin.com/in/${encodeURIComponent(cleanHandle)}`;
  const readerUrl = `https://r.jina.ai/${profileUrl}`;

  const res = await fetch(readerUrl, {
    headers: {
      "Accept": "text/plain",
      "X-Target-User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "X-No-Cache": "true"
    }
  });

  if (!res.ok) {
    throw new Error(`Could not reach LinkedIn profile (${res.status}). Please check your username.`);
  }

  const markdown = await res.text();

  let name = "";
  let headline = "";
  let picture = "";

  // 1. Extract Name & Headline from Title header
  // Example: "Title: Satya Nadella - Chairman and CEO at Microsoft | LinkedIn"
  const titleMatch = markdown.match(/Title:\s*(.+?)\s*\|\s*LinkedIn/i) || markdown.match(/Title:\s*(.+)/i);
  if (titleMatch) {
    const titleText = titleMatch[1].trim();
    if (!titleText.toLowerCase().includes("sign up") && !titleText.toLowerCase().includes("join linkedin")) {
      const sep = titleText.indexOf(" - ");
      if (sep !== -1) {
        name = titleText.substring(0, sep).trim();
        headline = titleText.substring(sep + 3).trim();
      } else {
        name = titleText;
      }
    }
  }

  // 2. Extract profile photo from licdn profile-displayphoto
  const displayPhotoMatch = markdown.match(/https:\/\/media\.licdn\.com\/[^\s\)\"\']*profile-displayphoto[^\s\)\"\']*/i);
  if (displayPhotoMatch) {
    picture = displayPhotoMatch[0];
  } else {
    // Fallback: any direct image from licdn that looks like a portrait/photo
    const anyLicdnMatch = markdown.match(/https:\/\/media\.licdn\.com\/dms\/image\/[^\s\)\"\']+/i);
    if (anyLicdnMatch && !anyLicdnMatch[0].includes("backgroundimage")) {
      picture = anyLicdnMatch[0];
    }
  }

  if (!name && !picture) {
    throw new Error("Could not find public profile details for this LinkedIn account. Please check the username.");
  }

  return {
    name: name || cleanHandle,
    headline: headline || "LinkedIn Creator & Professional",
    picture: picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || cleanHandle)}&background=0A66C2&color=fff`,
    handle: cleanHandle
  };
}
