import * as Instagram from "instagram-private-api";

type Account = {
  username: string;
  password: string;
}

const account = {
  username: "jo_hn2250",
  password: "w?>vs;/JD$Yo)za%kLEE;2++"
}

export type ErrorCodes = "USERNAME_DOES_NOT_EXIST" | "PROFILE_URL_IS_INVALID" | "PROFILE_URL_DOES_NOT_EXIST"

export const errors = {
  USERNAME_DOES_NOT_EXIST: "Username does not exist",
  PROFILE_URL_IS_INVALID: "Profile URL is invalid",
  PROFILE_URL_DOES_NOT_EXIST: "Profile URL does not exist"
}

export class ClientFactory {
  account: Account;
  client: Instagram.IgApiClient;
  session: any;
  errors: typeof errors;

  constructor() {
    this.account = account;
    this.client = new Instagram.IgApiClient();
    this.errors = errors;
  }

  getErrorString(code: ErrorCodes) {
    return this.errors[code];
  }

  async simulateCompleteSessionCreation() {
    const { username, password } = this.account;

    this.createClientDevice(username);
    await this.simulateClientPreLogin();
    this.session = await this.createClientSession(username, password);
    await this.simulateClientPostLogin();
  }

  createClientDevice(username: string): void {
    this.client.state.generateDevice(username);
  }

  simulateClientPreLogin(): Promise<void> {
    return this.client.simulate.preLoginFlow();
  }

  simulateClientPostLogin(): Promise<void> {
    return this.client.simulate.postLoginFlow();
  }

  createClientSession(username: string, password: string): Promise<any> {
    return this.client.account.login(username, password);
  }

  getAccountInfoForUsername(username: string) {
    return this.client.user.searchExact(username)
  }

  async getFollowerCountForUsername(username: string): Promise<number | null> {
    try {
      const info = await this.getAccountInfoForUsername(username);
      return info.follower_count;
    } catch (error) {
      return null
    }
  }
}

const InstagramProfileUrlRegExp = /(?:(?:http|https):\/\/)?(?:www.)?(?:instagram.com|instagr.am)\/([A-Za-z0-9-_\.]+)/im

export function getUsernameFromUrl(url: string): string | null {
    const match = url.match(InstagramProfileUrlRegExp);
    if (match) {
      const [full, username] = match;
      return username;
    } else {
      return null;
    }
}

export default ClientFactory;