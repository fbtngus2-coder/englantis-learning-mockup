import { handleWatchPixApiRequest } from "../../server/watchPixApi.mjs";

export default function handler(request, response) {
  return handleWatchPixApiRequest(request, response);
}
