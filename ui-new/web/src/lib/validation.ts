import type { Validator } from "@bufbuild/protovalidate";
import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";

let validator: Promise<Validator> | undefined;

function getValidator(): Promise<Validator> {
  return (validator ??= import("@bufbuild/protovalidate").then(
    ({ createValidator }) => createValidator(),
  ));
}

export function createRequestValidationInterceptor(
  isEnabled: () => boolean,
): Interceptor {
  return (next) => async (request) => {
    if (!isEnabled()) return next(request);

    if (request.stream) {
      throw new ConnectError(
        "Client request validation does not support streaming RPCs",
        Code.Unimplemented,
      );
    }

    const result = (await getValidator()).validate(
      request.method.input,
      request.message,
    );
    if (result.kind === "invalid") {
      throw new ConnectError(
        result.error.message,
        Code.InvalidArgument,
        undefined,
        undefined,
        result.error,
      );
    }
    if (result.kind === "error") {
      throw new ConnectError(
        "Client request validation failed",
        Code.Internal,
        undefined,
        undefined,
        result.error,
      );
    }

    return next(request);
  };
}
