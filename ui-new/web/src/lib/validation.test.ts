import { createClient, Code, ConnectError } from "@connectrpc/connect";
import { describe, expect, it, vi } from "vitest";
import { CatalogService } from "@/gen/uc/v1/catalog_pb";
import { VolumeService, VolumeType } from "@/gen/uc/v1/volume_pb";
import { makeTransport } from "@/test/providers";

describe("request validation", () => {
  it("rejects an invalid RPC before invoking the bridge handler", async () => {
    const getCatalog = vi.fn(() => ({ catalog: { name: "main" } }));
    const client = createClient(
      CatalogService,
      makeTransport(undefined, { catalogs: { getCatalog } }),
    );

    const call = client.getCatalog({ catalog: { name: "invalid.name" } });

    await expect(call).rejects.toMatchObject({
      code: Code.InvalidArgument,
      cause: expect.any(Error),
    } satisfies Partial<ConnectError>);
    expect(getCatalog).not.toHaveBeenCalled();
  });

  it("rejects a cross-field violation before invoking the bridge handler", async () => {
    const createVolume = vi.fn(() => ({}));
    const client = createClient(
      VolumeService,
      makeTransport(undefined, { volumes: { createVolume } }),
    );

    const call = client.createVolume({
      volume: {
        catalogName: "main",
        schemaName: "default",
        name: "raw",
      },
      volumeType: VolumeType.EXTERNAL,
    });

    await expect(call).rejects.toMatchObject({ code: Code.InvalidArgument });
    expect(createVolume).not.toHaveBeenCalled();
  });

  it("passes a valid RPC to the bridge handler", async () => {
    const getCatalog = vi.fn(() => ({ catalog: { name: "main" } }));
    const client = createClient(
      CatalogService,
      makeTransport(undefined, { catalogs: { getCatalog } }),
    );

    await expect(
      client.getCatalog({ catalog: { name: "main" } }),
    ).resolves.toMatchObject({ catalog: { name: "main" } });
    expect(getCatalog).toHaveBeenCalledOnce();
  });

  it("bypasses validation when the feature is disabled", async () => {
    const getCatalog = vi.fn(() => ({ catalog: { name: "invalid.name" } }));
    const client = createClient(
      CatalogService,
      makeTransport(undefined, { catalogs: { getCatalog } }, false),
    );

    await expect(
      client.getCatalog({ catalog: { name: "invalid.name" } }),
    ).resolves.toMatchObject({ catalog: { name: "invalid.name" } });
    expect(getCatalog).toHaveBeenCalledOnce();
  });
});
