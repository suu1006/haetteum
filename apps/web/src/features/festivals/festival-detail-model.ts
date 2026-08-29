import type { FestivalDetailResponse } from "@haetteum/contracts";

import type { DiscoveryImage } from "@/features/discovery/discovery-model";

export function buildFestivalDetailHref(id: string) {
  return `/festivals/${encodeURIComponent(id)}`;
}

export type FestivalDetailStatus = "ongoing" | "upcoming" | "ended";

export type FestivalDetailEventInfoItem = {
  id: string;
  label: string;
  value: string;
};

export type FestivalDetailView = {
  id: string;
  title: string;
  status: FestivalDetailStatus;
  statusLabel: "진행 중" | "예정" | "종료";
  dateLabel: string;
  location: string;
  categoryLabel: string;
  telephone: string | null;
  homepage: string | null;
  mapUrl: string | null;
  overview: string | null;
  program: string | null;
  eventInfo: readonly FestivalDetailEventInfoItem[];
  primaryImage: DiscoveryImage | null;
  gallery: readonly DiscoveryImage[];
};

const STATUS_LABEL: Record<FestivalDetailStatus, FestivalDetailView["statusLabel"]> =
  {
    ongoing: "진행 중",
    upcoming: "예정",
    ended: "종료",
  };

export function formatFestivalDateRange(start: string, end: string): string {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startLabel = `${startYear}. ${startMonth}. ${startDay}.`;
  const endLabel =
    startYear === endYear
      ? `${endMonth}. ${endDay}.`
      : `${endYear}. ${endMonth}. ${endDay}.`;
  return `${startLabel} – ${endLabel}`;
}

function formatOrganizerLine(
  organizer: string | null,
  organizerTel: string | null,
  hostAgency: string | null,
  hostAgencyTel: string | null,
): string | null {
  const parts: string[] = [];
  if (organizer) {
    parts.push(
      organizerTel ? `주최 ${organizer} (${organizerTel})` : `주최 ${organizer}`,
    );
  }
  if (hostAgency) {
    parts.push(
      hostAgencyTel
        ? `주관 ${hostAgency} (${hostAgencyTel})`
        : `주관 ${hostAgency}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function buildEventInfo(
  festival: FestivalDetailResponse,
): FestivalDetailEventInfoItem[] {
  const items: FestivalDetailEventInfoItem[] = [];
  if (festival.eventPlace) {
    items.push({ id: "place", label: "행사 장소", value: festival.eventPlace });
  }
  if (festival.eventTime) {
    items.push({ id: "time", label: "행사 시간", value: festival.eventTime });
  }
  if (festival.feeInfo) {
    items.push({ id: "fee", label: "이용 요금", value: festival.feeInfo });
  }
  const organizerLine = formatOrganizerLine(
    festival.organizer,
    festival.organizerTel,
    festival.hostAgency,
    festival.hostAgencyTel,
  );
  if (organizerLine) {
    items.push({ id: "organizer", label: "주최/주관", value: organizerLine });
  }
  return items;
}

export function mapFestivalDetail(
  festival: FestivalDetailResponse,
): FestivalDetailView {
  const status: FestivalDetailStatus =
    festival.status === "ONGOING"
      ? "ongoing"
      : festival.status === "UPCOMING"
        ? "upcoming"
        : "ended";
  const primaryImage: DiscoveryImage | null = festival.primaryImageUrl
    ? { src: festival.primaryImageUrl, alt: `${festival.title} 대표 이미지` }
    : null;
  const gallery: DiscoveryImage[] = festival.images.map((image) => ({
    src: image.url,
    alt: image.alt,
  }));

  return {
    id: festival.id,
    title: festival.title,
    status,
    statusLabel: STATUS_LABEL[status],
    dateLabel: formatFestivalDateRange(
      festival.eventStartDate,
      festival.eventEndDate,
    ),
    location: festival.address ?? "지역 정보 없음",
    categoryLabel: festival.categoryLabel,
    telephone: festival.telephone,
    homepage: festival.homepage,
    mapUrl:
      festival.latitude != null && festival.longitude != null
        ? `https://map.kakao.com/link/map/${encodeURIComponent(
            festival.title,
          )},${festival.latitude},${festival.longitude}`
        : null,
    overview: festival.overview,
    program: festival.program,
    eventInfo: buildEventInfo(festival),
    primaryImage,
    gallery: gallery.length > 0 ? gallery : primaryImage ? [primaryImage] : [],
  };
}
