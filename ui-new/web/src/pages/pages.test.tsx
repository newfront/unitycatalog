import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@tanstack/react-router", () => import("@/test/tanstack-router-mock"));

import {
  renderWithProviders,
  type RpcHandlers,
  type UcHandler,
} from "@/test/providers";
import { ColumnTypeName } from "@/gen/uc/v1/common_pb";
import { DataSourceFormat, TableType } from "@/gen/uc/v1/table_pb";
import { VolumeType } from "@/gen/uc/v1/volume_pb";
import { ModelVersionStatus } from "@/gen/uc/v1/model_pb";
import CatalogsList from "@/pages/CatalogsList";
import CatalogDetails from "@/pages/CatalogDetails";
import SchemaDetails from "@/pages/SchemaDetails";
import TableDetails from "@/pages/TableDetails";
import VolumeDetails from "@/pages/VolumeDetails";
import FunctionDetails from "@/pages/FunctionDetails";
import ModelDetails from "@/pages/ModelDetails";
import ModelVersionDetails from "@/pages/ModelVersionDetails";
import MetricViewDetails from "@/pages/MetricViewDetails";

const identity = { catalogName: "main", schemaName: "default" };
const rpc: RpcHandlers = {
  catalogs: {
    listCatalogs: () => ({ catalogs: [{ name: "main", comment: "root" }] }),
    getCatalog: () => ({
      catalog: {
        name: "main",
        comment: "root",
        audit: { owner: "me" },
        properties: { values: { k: "v" } },
      },
    }),
  },
  schemas: {
    listSchemas: () => ({ schemas: [{ ...identity, name: "default" }] }),
    getSchema: () => ({
      schema: { ...identity, name: "default", comment: "sc" },
    }),
  },
  tables: {
    listTables: () => ({
      tables: [{ ...identity, name: "events", tableType: TableType.MANAGED }],
    }),
    getTable: () => ({
      table: {
        ...identity,
        name: "events",
        tableType: TableType.MANAGED,
        dataSourceFormat: DataSourceFormat.DELTA,
        comment: "clickstream",
        columns: [
          {
            name: "id",
            typeText: "string",
            typeName: ColumnTypeName.STRING,
            nullable: true,
            position: 0,
          },
        ],
      },
    }),
  },
  views: {
    listViews: () => ({ views: [{ ...identity, name: "metrics" }] }),
    getView: () => ({
      view: {
        ...identity,
        name: "metrics",
        viewDefinition: "version: 1.1\nsource: main.default.events",
        columns: [
          {
            name: "total",
            typeText: "bigint",
            typeName: ColumnTypeName.LONG,
            nullable: true,
          },
        ],
      },
    }),
  },
  volumes: {
    listVolumes: () => ({ volumes: [{ ...identity, name: "vol" }] }),
    getVolume: () => ({
      volume: {
        ...identity,
        name: "vol",
        volumeType: VolumeType.MANAGED,
        storageLocation: "s3://x",
      },
    }),
  },
  functions: {
    listFunctions: () => ({ functions: [{ ...identity, name: "fn" }] }),
    getFunction: () => ({
      function: {
        ...identity,
        name: "fn",
        inputParameters: [
          {
            name: "x",
            typeText: "int",
            typeName: ColumnTypeName.INT,
            position: 0,
          },
        ],
      },
    }),
  },
  models: {
    listRegisteredModels: () => ({ models: [{ ...identity, name: "mdl" }] }),
    getRegisteredModel: () => ({
      model: { ...identity, name: "mdl", comment: "a model" },
    }),
    listModelVersions: () => ({
      versions: [
        {
          ...identity,
          modelName: "mdl",
          version: 1n,
          status: ModelVersionStatus.READY,
        },
      ],
    }),
    getModelVersion: () => ({
      modelVersion: {
        ...identity,
        modelName: "mdl",
        version: 1n,
        status: ModelVersionStatus.READY,
        source: "s3://m",
      },
    }),
  },
};

const handler: UcHandler = ({ path }) => ({
  httpStatus: 200,
  ok: true,
  body: JSON.stringify(
    path.includes("/permissions/")
      ? {
          privilege_assignments: [{ principal: "ada", privileges: ["SELECT"] }],
        }
      : {},
  ),
});

const options = { handler, rpc };

async function clickTabs() {
  // Tabs live inside QueryState, so wait for them to mount once data resolves.
  await userEvent.click(await screen.findByRole("tab", { name: "Details" }));
  await userEvent.click(
    await screen.findByRole("tab", { name: "Permissions" }),
  );
}

describe("CatalogsList", () => {
  it("lists catalogs", async () => {
    renderWithProviders(<CatalogsList />, options);
    expect(await screen.findByText("main")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Catalogs" }),
    ).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    renderWithProviders(<CatalogsList />, {
      rpc: { catalogs: { listCatalogs: () => ({ catalogs: [] }) } },
    });
    expect(await screen.findByText("No catalogs yet.")).toBeInTheDocument();
  });
});

describe("CatalogDetails", () => {
  it("renders overview, details, and permissions", async () => {
    renderWithProviders(<CatalogDetails catalog="main" />, options);
    expect(
      await screen.findByRole("heading", { name: "main" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("root")).toBeInTheDocument();
    expect(await screen.findByText("default")).toBeInTheDocument();
    await clickTabs();
    await waitFor(() => expect(screen.getByText("ada")).toBeInTheDocument());
  });
});

describe("SchemaDetails", () => {
  it("renders the object browser and tabs", async () => {
    renderWithProviders(<SchemaDetails catalog="main" schema="default" />, {
      ...options,
    });
    expect(
      await screen.findByRole("heading", { name: "default" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("events")).toBeInTheDocument();
    expect(await screen.findByText("vol")).toBeInTheDocument();
    expect(await screen.findByText("fn")).toBeInTheDocument();
    expect(await screen.findByText("mdl")).toBeInTheDocument();
    await clickTabs();
    await waitFor(() => expect(screen.getByText("ada")).toBeInTheDocument());
  });
});

describe("TableDetails", () => {
  it("renders columns and metadata", async () => {
    renderWithProviders(
      <TableDetails catalog="main" schema="default" table="events" />,
      options,
    );
    expect(
      await screen.findByRole("heading", { name: "events" }),
    ).toBeInTheDocument();
    // Badges + columns come from the async table fetch.
    expect(await screen.findByText("MANAGED")).toBeInTheDocument();
    expect(screen.getByText("clickstream")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    await clickTabs();
    await waitFor(() => expect(screen.getByText("ada")).toBeInTheDocument());
  });
});

describe("MetricViewDetails", () => {
  it("renders columns, definition, and metadata", async () => {
    renderWithProviders(
      <MetricViewDetails catalog="main" schema="default" view="metrics" />,
      options,
    );
    expect(
      await screen.findByRole("heading", { name: "metrics" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("total")).toBeInTheDocument();
    expect(screen.getByText(/source: main.default.events/)).toBeInTheDocument();
  });
});

describe("VolumeDetails", () => {
  it("renders overview + details", async () => {
    renderWithProviders(
      <VolumeDetails catalog="main" schema="default" volume="vol" />,
      options,
    );
    expect(
      await screen.findByRole("heading", { name: "vol" }),
    ).toBeInTheDocument();
    // Storage location lives on the Details tab.
    await userEvent.click(await screen.findByRole("tab", { name: "Details" }));
    await waitFor(() => expect(screen.getByText("s3://x")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("tab", { name: "Permissions" }));
    await waitFor(() => expect(screen.getByText("ada")).toBeInTheDocument());
  });
});

describe("FunctionDetails", () => {
  it("renders input parameters", async () => {
    renderWithProviders(
      <FunctionDetails catalog="main" schema="default" ucFunction="fn" />,
      options,
    );
    expect(
      await screen.findByRole("heading", { name: "fn" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("x")).toBeInTheDocument();
    await clickTabs();
    await waitFor(() => expect(screen.getByText("ada")).toBeInTheDocument());
  });
});

describe("ModelDetails", () => {
  it("lists versions and links to a version", async () => {
    renderWithProviders(
      <ModelDetails catalog="main" schema="default" model="mdl" />,
      options,
    );
    expect(
      await screen.findByRole("heading", { name: "mdl" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "v1" })).toHaveAttribute(
      "href",
      "/catalog/main/default/model/mdl/version/1",
    );
    await clickTabs();
    await waitFor(() => expect(screen.getByText("ada")).toBeInTheDocument());
  });
});

describe("ModelVersionDetails", () => {
  it("renders version metadata", async () => {
    renderWithProviders(
      <ModelVersionDetails
        catalog="main"
        schema="default"
        model="mdl"
        version="1"
      />,
      options,
    );
    expect(await screen.findByText("s3://m")).toBeInTheDocument();
  });

  it("rejects invalid version route parameters without crashing", async () => {
    renderWithProviders(
      <ModelVersionDetails
        catalog="main"
        schema="default"
        model="mdl"
        version="invalid"
      />,
      options,
    );

    expect(
      await screen.findByText("Invalid model version: invalid"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit comment" }),
    ).not.toBeInTheDocument();
  });
});
