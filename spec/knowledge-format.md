# Định dạng `.aegis/` (phiên bản 1)

```
.aegis/
├── config.json            # commit — {version, profile, refs: [{name, git?}], imports: [...], lastScan: {ref, commit, at}}
├── local.json             # KHÔNG commit — {refs: {name: "/đường/dẫn/trên/máy/này"}}
├── knowledge/<ref>/       # sinh bởi `aegis scan` (đã che secret)
│   ├── knowledge.json     # toàn bộ (các file dưới là bản tách)
│   ├── environments.json  # [{name, group, source, fields: [{key, value, envVar?, source}]}]  value: <REDACTED:secret> | <URL> | giá trị không nhạy cảm
│   ├── endpoints.json     # [Entry & {absolute?}]
│   ├── actions.json       # [Entry]
│   ├── server-messages.json  # [Entry & {kind: message|code|status}]
│   ├── http-files.json    # [{file, role: http-client|signing, confidence, evidence: [{line, text}]}]
│   ├── routes.json        # [{name, component, navigator, source}]
│   └── features/_index.json, features/<slug>.json
├── knowledge/manual/actions.json   # `aegis action add`
├── profile/profile.json, protocol.md   # spec/profile-schema.md
├── vectors/*.json         # định dạng profiles/demo/vectors.json (secret GIẢ)
├── specs/<slug>.md        # templates/feature-spec.md (đã duyệt)
├── docs/                  # tài liệu BA (`aegis doc add`)
└── learn/                 # KHÔNG commit — nguyên liệu tạm của `profile learn`
```

`Entry = {key, value, comment, group, source: "đường/dẫn:dòng"}`. Mọi `source` tương đối so với gốc app tham chiếu.

`features/<slug>.json = {slug, dir, subFeatures[], screens: [{file, components[], fields: [{component, name, label, required, source}], actions: [{key, source}], calls[], messages: [{kind: ui|ui-dynamic|server, title?, text?, expr?, source}], navigation: [{target, source}], conditions: [{text, source}]}], actionIndex: [{key, value, comment, source}], ref}`.

Thay đổi định dạng → tăng `version` trong `config.json` và giữ đọc được phiên bản cũ.
