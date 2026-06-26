import { handleTeachApiRequest } from "../../server/teachApi.mjs";

export default function handler(request, response) {
  return handleTeachApiRequest(request, response);
}

