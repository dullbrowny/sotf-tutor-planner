import * as mockApi from './mockApi'
import * as cbse from './adapters/cbseAdapter'

export const api =
  import.meta.env.VITE_DATA_DOMAIN === 'cbse'
    ? { ...mockApi, cbse }
    : mockApi

