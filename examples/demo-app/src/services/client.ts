import axios from 'axios';
import {sha256} from 'js-sha256';
import {store} from '../store';
import Config from './config';

const env = Config.ENV_DEV;
const api = axios.create({baseURL: env.BASE_URL, timeout: Config.TIMEOUT});

const base64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Chữ ký: sha256( base64url(JSON(payload)) + "." + secret )
const signPayload = (payload: object) => sha256(base64url(JSON.stringify(payload)) + '.' + env.SECRET_KEY);

const defaults = () => {
  const user = store.getState().user.data;
  return {channel: 'MOBILE', device_id: store.getState().device.id, partner: env.PARTNER_CODE, branch: user?.branch ?? null, username: user?.username ?? null};
};

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err),
);

export const execute = async (action: string, params = {}) => {
  const payload = {...defaults(), ...params};
  const headers = {
    'Content-Type': 'application/json',
    xPartner: env.PARTNER_CODE,
    xAction: action,
    xToken: store.getState().user.data?.token?.access || '',
    xEnv: env.ENV,
    xSign: signPayload(payload),
  };
  const body = {meta: {app: 'com.example.demo', time: Date.now()}, payload};
  const res: any = await api.post(Config.ENDPOINT.EXECUTE, body, {headers});
  if (res?.status?.code === 'FAIL') return handleFail(res, () => execute(action, params));
  return res;
};

const handleFail = async (res: any, retry: () => Promise<any>) => {
  if (res.status.message === Config.SERVER_MESSAGE.TOKEN_EXPIRED) {
    const r: any = await api.post(Config.ENDPOINT.REFRESH, {access: '', refresh: ''}, {headers: {xPartner: env.PARTNER_CODE}});
    if (r?.status?.code === 'OK') return retry();
  }
  if (res.status.message === Config.SERVER_MESSAGE.OTHER_DEVICE) {
    store.dispatch({type: 'user/logout'});
  }
  return res;
};
