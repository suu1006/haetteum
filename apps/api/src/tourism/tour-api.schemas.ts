import { z } from "zod";

const optionalProviderText = z.string().optional();

export const tourApiDistrictSchema = z.object({
  lDongRegnCd: z.string(),
  lDongRegnNm: optionalProviderText,
  lDongSignguCd: z.string(),
  lDongSignguNm: z.string(),
});

export const tourApiPlaceSchema = z.object({
  contentid: z.string(),
  contenttypeid: z.string(),
  title: z.string(),
  addr1: optionalProviderText,
  addr2: optionalProviderText,
  zipcode: optionalProviderText,
  mapx: optionalProviderText,
  mapy: optionalProviderText,
  mlevel: optionalProviderText,
  tel: optionalProviderText,
  firstimage: optionalProviderText,
  firstimage2: optionalProviderText,
  cpyrhtDivCd: optionalProviderText,
  createdtime: optionalProviderText,
  modifiedtime: z.string(),
  lDongRegnCd: z.string(),
  lDongSignguCd: optionalProviderText,
  lclsSystm1: optionalProviderText,
  lclsSystm2: optionalProviderText,
  lclsSystm3: optionalProviderText,
});

export const tourApiChangedPlaceSchema = tourApiPlaceSchema.extend({
  showflag: z.enum(["0", "1"]),
  oldContentid: optionalProviderText,
});

export const tourApiPlaceDetailSchema = z.object({
  contentid: z.string(),
  contenttypeid: optionalProviderText,
  title: optionalProviderText,
  overview: optionalProviderText,
  homepage: optionalProviderText,
});

export const tourApiFestivalSchema = z.object({
  contentid: z.string(),
  contenttypeid: z.string(),
  title: z.string(),
  eventstartdate: z.string(),
  eventenddate: z.string(),
  addr1: optionalProviderText,
  addr2: optionalProviderText,
  zipcode: optionalProviderText,
  mapx: optionalProviderText,
  mapy: optionalProviderText,
  mlevel: optionalProviderText,
  tel: optionalProviderText,
  firstimage: optionalProviderText,
  firstimage2: optionalProviderText,
  cpyrhtDivCd: optionalProviderText,
  createdtime: optionalProviderText,
  modifiedtime: z.string(),
  lDongRegnCd: optionalProviderText,
  lDongSignguCd: optionalProviderText,
  lclsSystm1: z.string(),
  lclsSystm2: z.string(),
  lclsSystm3: optionalProviderText,
});

export function itemArraySchema<T extends z.ZodTypeAny>(item: T) {
  return z.preprocess((value: unknown) => {
    if (value === "" || value == null) return [];

    if (Array.isArray(value)) {
      return value.map((entry): unknown => entry);
    }

    return [value];
  }, z.array(item));
}

export function tourApiPageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    response: z.object({
      header: z.object({
        resultCode: z.string(),
        resultMsg: z.string(),
      }),
      body: z.object({
        items: z
          .union([z.object({ item: itemArraySchema(item) }), z.literal("")])
          .optional(),
        pageNo: z.coerce.number().int().positive(),
        numOfRows: z.coerce.number().int().nonnegative(),
        totalCount: z.coerce.number().int().nonnegative(),
      }),
    }),
  });
}

export const tourApiHeaderSchema = z.object({
  response: z.object({
    header: z.object({
      resultCode: z.string(),
      resultMsg: z.string(),
    }),
  }),
});
