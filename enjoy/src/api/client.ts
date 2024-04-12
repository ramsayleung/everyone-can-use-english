import axios, { AxiosInstance } from "axios";
import decamelizeKeys from "decamelize-keys";
import camelcaseKeys from "camelcase-keys";

const ONE_MINUTE = 1000 * 60; // 1 minute

export class Client {
  public api: AxiosInstance;
  public baseUrl: string;
  public logger: any;

  constructor(options: {
    baseUrl: string;
    accessToken?: string;
    logger?: any;
    locale?: "en" | "zh-CN";
  }) {
    const { baseUrl, accessToken, logger, locale = "en" } = options;
    this.baseUrl = baseUrl;
    this.logger = logger || console;

    this.api = axios.create({
      baseURL: baseUrl,
      timeout: ONE_MINUTE,
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.api.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${accessToken}`;
      config.headers["Accept-Language"] = locale;

      this.logger.debug(
        config.method.toUpperCase(),
        config.baseURL + config.url,
        config.data,
        config.params
      );
      return config;
    });
    this.api.interceptors.response.use(
      (response) => {
        this.logger.debug(
          response.status,
          response.config.method.toUpperCase(),
          response.config.baseURL + response.config.url
        );
        return camelcaseKeys(response.data, { deep: true });
      },
      (err) => {
        if (err.response) {
          this.logger.error(
            err.response.status,
            err.response.config.method.toUpperCase(),
            err.response.config.baseURL + err.response.config.url
          );
          this.logger.error(err.response.data);
          return Promise.reject(new Error(err.response.data));
        }

        if (err.request) {
          this.logger.error(err.request);
        } else {
          this.logger.error(err.message);
        }

        return Promise.reject(err);
      }
    );
  }

  auth(params: {
    provider: "mixin" | "github" | "bandu" | "email";
    code: string;
    phoneNumber?: string;
    email?: string;
  }): Promise<UserType> {
    return this.api.post("/api/sessions", decamelizeKeys(params));
  }

  me(): Promise<UserType> {
    return this.api.get("/api/me");
  }

  updateProfile(
    id: string,
    params: {
      name?: string;
      email?: string;
      code?: string;
    }
  ): Promise<UserType> {
    return this.api.put(`/api/users/${id}`, decamelizeKeys(params));
  }

  loginCode(params: { phoneNumber?: string; email?: string }): Promise<void> {
    return this.api.post("/api/sessions/login_code", decamelizeKeys(params));
  }

  rankings(range: "day" | "week" | "month" | "year" | "all" = "day"): Promise<{
    rankings: UserType[];
    range: string;
  }> {
    return this.api.get("/api/users/rankings", { params: { range } });
  }

  users(filter: "following" | "followers" = "followers"): Promise<
    {
      users: UserType[];
    } & PagyResponseType
  > {
    return this.api.get("/api/users", { params: { filter } });
  }

  user(id: string): Promise<UserType> {
    return this.api.get(`/api/users/${id}`);
  }

  userFollowing(
    id: string,
    options: { page: number }
  ): Promise<
    {
      users: UserType[];
    } & PagyResponseType
  > {
    return this.api.get(`/api/users/${id}/following`, {
      params: decamelizeKeys(options),
    });
  }

  userFollowers(
    id: string,
    options: { page: number }
  ): Promise<
    {
      users: UserType[];
    } & PagyResponseType
  > {
    return this.api.get(`/api/users/${id}/followers`, {
      params: decamelizeKeys(options),
    });
  }

  follow(id: string): Promise<
    {
      user: UserType;
    } & {
      following: boolean;
    }
  > {
    return this.api.post(`/api/users/${id}/follow`);
  }

  unfollow(id: string): Promise<
    {
      user: UserType;
    } & {
      following: boolean;
    }
  > {
    return this.api.post(`/api/users/${id}/unfollow`);
  }

  posts(params?: {
    page?: number;
    items?: number;
    userId?: string;
    type?: "all" | "recording" | "medium" | "story" | "prompt" | "text" | "gpt";
    by?: "following" | "all";
  }): Promise<
    {
      posts: PostType[];
    } & PagyResponseType
  > {
    return this.api.get("/api/posts", { params: decamelizeKeys(params) });
  }

  post(id: string): Promise<PostType> {
    return this.api.get(`/api/posts/${id}`);
  }

  createPost(params: {
    metadata?: PostType["metadata"];
    targetType?: string;
    targetId?: string;
  }): Promise<PostType> {
    return this.api.post("/api/posts", decamelizeKeys(params));
  }

  updatePost(id: string, params: { content: string }): Promise<PostType> {
    return this.api.put(`/api/posts/${id}`, decamelizeKeys(params));
  }

  deletePost(id: string): Promise<void> {
    return this.api.delete(`/api/posts/${id}`);
  }

  transcriptions(params?: {
    page?: number;
    items?: number;
    targetId?: string;
    targetType?: string;
    targetMd5?: string;
  }): Promise<
    {
      transcriptions: TranscriptionType[];
    } & PagyResponseType
  > {
    return this.api.get("/api/transcriptions", {
      params: decamelizeKeys(params),
    });
  }

  syncAudio(audio: Partial<AudioType>) {
    return this.api.post("/api/mine/audios", decamelizeKeys(audio));
  }

  deleteAudio(id: string) {
    return this.api.delete(`/api/mine/audios/${id}`);
  }

  syncVideo(video: Partial<VideoType>) {
    return this.api.post("/api/mine/videos", decamelizeKeys(video));
  }

  deleteVideo(id: string) {
    return this.api.delete(`/api/mine/videos/${id}`);
  }

  syncTranscription(transcription: Partial<TranscriptionType>) {
    return this.api.post("/api/transcriptions", decamelizeKeys(transcription));
  }

  syncRecording(recording: Partial<RecordingType>) {
    if (!recording) return;

    return this.api.post("/api/mine/recordings", decamelizeKeys(recording));
  }

  deleteRecording(id: string) {
    return this.api.delete(`/api/mine/recordings/${id}`);
  }

  generateSpeechToken(params?: {
    targetType?: string;
    targetId?: string;
  }): Promise<{ token: string; region: string }> {
    return this.api.post("/api/speech/tokens", decamelizeKeys(params || {}));
  }

  syncPronunciationAssessment(
    pronunciationAssessment: Partial<PronunciationAssessmentType>
  ) {
    if (!pronunciationAssessment) return;

    return this.api.post(
      "/api/mine/pronunciation_assessments",
      decamelizeKeys(pronunciationAssessment)
    );
  }

  recordingAssessment(id: string) {
    return this.api.get(`/api/mine/recordings/${id}/assessment`);
  }

  lookup(params: {
    word: string;
    context: string;
    sourceId?: string;
    sourceType?: string;
  }): Promise<LookupType> {
    return this.api.post("/api/lookups", decamelizeKeys(params));
  }

  updateLookup(
    id: string,
    params: {
      meaning: Partial<MeaningType>;
      sourceId?: string;
      sourceType?: string;
    }
  ): Promise<LookupType> {
    return this.api.put(`/api/lookups/${id}`, decamelizeKeys(params));
  }

  lookupInBatch(
    lookups: {
      word: string;
      context: string;
      sourceId?: string;
      sourceType?: string;
    }[]
  ): Promise<{ successCount: number; errors: string[]; total: number }> {
    return this.api.post("/api/lookups/batch", {
      lookups: decamelizeKeys(lookups, { deep: true }),
    });
  }

  extractVocabularyFromStory(
    storyId: string,
    extraction?: {
      words?: string[];
      idioms?: string[];
    }
  ): Promise<string[]> {
    return this.api.post(
      `/api/stories/${storyId}/extract_vocabulary`,
      decamelizeKeys({ extraction })
    );
  }

  storyMeanings(
    storyId: string,
    params?: {
      page?: number;
      items?: number;
    }
  ): Promise<
    {
      meanings: MeaningType[];
      pendingLookups?: LookupType[];
    } & PagyResponseType
  > {
    return this.api.get(`/api/stories/${storyId}/meanings`, {
      params: decamelizeKeys(params),
    });
  }

  mineMeanings(params?: {
    page?: number;
    items?: number;
    sourceId?: string;
    sourceType?: string;
    status?: string;
  }): Promise<
    {
      meanings: MeaningType[];
    } & PagyResponseType
  > {
    return this.api.get("/api/mine/meanings", {
      params: decamelizeKeys(params),
    });
  }

  createStory(params: CreateStoryParamsType): Promise<StoryType> {
    return this.api.post("/api/stories", decamelizeKeys(params));
  }

  story(id: string): Promise<StoryType> {
    return this.api.get(`/api/stories/${id}`);
  }

  stories(params?: { page: number }): Promise<
    {
      stories: StoryType[];
    } & PagyResponseType
  > {
    return this.api.get("/api/stories", { params: decamelizeKeys(params) });
  }

  mineStories(params?: { page: number }): Promise<
    {
      stories: StoryType[];
    } & PagyResponseType
  > {
    return this.api.get("/api/mine/stories", {
      params: decamelizeKeys(params),
    });
  }

  starStory(storyId: string): Promise<{ starred: boolean }> {
    return this.api.post(`/api/mine/stories`, decamelizeKeys({ storyId }));
  }

  unstarStory(storyId: string): Promise<{ starred: boolean }> {
    return this.api.delete(`/api/mine/stories/${storyId}`);
  }

  createPayment(params: {
    amount: number;
    processor: string;
    paymentType: string;
  }): Promise<PaymentType> {
    return this.api.post("/api/payments", decamelizeKeys(params));
  }

  payments(params?: {
    paymentType?: string;
    page?: number;
    items?: number;
  }): Promise<
    {
      payments: PaymentType[];
    } & PagyResponseType
  > {
    return this.api.get("/api/payments", { params: decamelizeKeys(params) });
  }

  payment(id: string): Promise<PaymentType> {
    return this.api.get(`/api/payments/${id}`);
  }
}
