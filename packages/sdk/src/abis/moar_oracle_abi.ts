// This file is auto-generated by the generate-abis.ts script
export const moar_oracle_abi = {
  "address": "0x0",
  "name": "oracle",
  "friends": [],
  "exposed_functions": [
    {
      "name": "initialize",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "is_initialized",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "bool"
      ]
    },
    {
      "name": "get_price",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x1::fungible_asset::Metadata>"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_value_of",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [
        "0x1::object::Object<0x1::fungible_asset::Metadata>",
        "u64"
      ],
      "return": [
        "u64"
      ]
    },
    {
      "name": "get_tiered_oracle",
      "visibility": "public",
      "is_entry": false,
      "is_view": true,
      "generic_type_params": [],
      "params": [],
      "return": [
        "0x1::object::Object<0xd74401951a74141b1c0b2a7285fb7e060bf56be829f9e34182819f9c5546e90b::tiered_oracle::TieredOracle>"
      ]
    },
    {
      "name": "set_tiered_oracle",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "address"
      ],
      "return": []
    },
    {
      "name": "update_lp_token_adapter_id",
      "visibility": "public",
      "is_entry": true,
      "is_view": false,
      "generic_type_params": [],
      "params": [
        "&signer",
        "0x1::object::Object<0x1::fungible_asset::Metadata>",
        "0x1::option::Option<u8>"
      ],
      "return": []
    }
  ],
  "structs": [
    {
      "name": "LpTokenAdapterIdUpdated",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "asset",
          "type": "0x1::object::Object<0x1::fungible_asset::Metadata>"
        },
        {
          "name": "adapter_id",
          "type": "0x1::option::Option<u8>"
        }
      ]
    },
    {
      "name": "OracleConfig",
      "is_native": false,
      "is_event": false,
      "abilities": [
        "key"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "tiered_oracle",
          "type": "0x1::object::Object<0xd74401951a74141b1c0b2a7285fb7e060bf56be829f9e34182819f9c5546e90b::tiered_oracle::TieredOracle>"
        },
        {
          "name": "lp_token_map",
          "type": "0x1::smart_table::SmartTable<0x1::object::Object<0x1::fungible_asset::Metadata>, 0x1::option::Option<u8>>"
        }
      ]
    },
    {
      "name": "TieredOracleSet",
      "is_native": false,
      "is_event": true,
      "abilities": [
        "drop",
        "store"
      ],
      "generic_type_params": [],
      "fields": [
        {
          "name": "tiered_oracle_address",
          "type": "address"
        }
      ]
    }
  ]
} as const;
