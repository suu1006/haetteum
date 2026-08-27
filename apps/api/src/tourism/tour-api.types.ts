export type TourApiPage<T> = {
  items: readonly T[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
};

export type TourApiDistrict = {
  lDongRegnCd: string;
  lDongRegnNm?: string;
  lDongSignguCd: string;
  lDongSignguNm: string;
};

export type TourApiPlace = {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  zipcode?: string;
  mapx?: string;
  mapy?: string;
  mlevel?: string;
  tel?: string;
  firstimage?: string;
  firstimage2?: string;
  cpyrhtDivCd?: string;
  createdtime?: string;
  modifiedtime: string;
  lDongRegnCd: string;
  lDongSignguCd?: string;
  lclsSystm1?: string;
  lclsSystm2?: string;
  lclsSystm3?: string;
};

export type TourApiChangedPlace = TourApiPlace & {
  showflag: "0" | "1";
  oldContentid?: string;
};

export type TourApiPlaceDetail = {
  contentid: string;
  contenttypeid?: string;
  title?: string;
  overview?: string;
  homepage?: string;
};

export type TourApiPlaceIntro = {
  contentid: string;
  contenttypeid?: string;
  infocenter?: string;
  restdate?: string;
  useseason?: string;
  usetime?: string;
  parking?: string;
  expagerange?: string;
  expguide?: string;
  chkbabycarriage?: string;
  chkcreditcard?: string;
  chkpet?: string;
};

export type TourApiPlaceInfo = {
  contentid: string;
  contenttypeid?: string;
  fldgubun?: string;
  infoname: string;
  infotext: string;
  serialnum: string;
};

export type TourApiPlaceImage = {
  contentid: string;
  imgname?: string;
  originimgurl: string;
  smallimageurl?: string;
  serialnum: string;
  cpyrhtDivCd?: string;
};

export type TourApiFestival = {
  contentid: string;
  contenttypeid: string;
  title: string;
  eventstartdate: string;
  eventenddate: string;
  addr1?: string;
  addr2?: string;
  zipcode?: string;
  mapx?: string;
  mapy?: string;
  mlevel?: string;
  tel?: string;
  firstimage?: string;
  firstimage2?: string;
  cpyrhtDivCd?: string;
  createdtime?: string;
  modifiedtime: string;
  lDongRegnCd?: string;
  lDongSignguCd?: string;
  lclsSystm1: string;
  lclsSystm2: string;
  lclsSystm3?: string;
};

export interface FestivalApiPort {
  getFestivalPage(input: {
    eventStartDate: string;
    eventEndDate: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiFestival>>;
}

export interface TourApiPort {
  getDistrictPage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiDistrict>>;
  getPlacePage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiPlace>>;
  getChangedPlacePage(input: {
    regionCode: string;
    modifiedDate: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>>;
  getChangedPlaceProbePage(input: {
    regionCode: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>>;
  getPlaceCommonDetail(contentId: string): Promise<TourApiPlaceDetail>;
  getPlaceIntro(contentId: string): Promise<TourApiPlaceIntro>;
  getPlaceRepeatInfo(contentId: string): Promise<readonly TourApiPlaceInfo[]>;
  getPlaceImages(contentId: string): Promise<readonly TourApiPlaceImage[]>;
}

export type TourApiFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export type TourApiSleep = (milliseconds: number) => Promise<void>;
