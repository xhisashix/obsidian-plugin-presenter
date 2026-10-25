# PR Templates Resource

When no repository-level PR template is found, use one of the templates below.

---

## 1. Standard Template (Japanese / 日本語)

```markdown
## 概要 (Summary)
<!-- なぜこの変更を行うのか、解決する課題や背景を簡潔に記載してください -->
- 

## 変更内容 (Changes)
<!-- 主な実装・修正内容を箇条書きで記載してください -->
- 

## 動作確認・検証 (Verification)
<!-- 実施したテストや確認手順を記載してください -->
- [ ] 単体テスト / CIの通過 (`npm test`, `npm run lint` など)
- [ ] 動作確認手順:
  1. 
  2. 

## 影響範囲・破壊的変更 (Impact & Breaking Changes)
- 影響範囲: 
- 破壊的変更の有無: なし / あり (内容: )

## 関連Issue / リンク (Related Issues)
- 関連Issue: #
```

---

## 2. Standard Template (English)

```markdown
## Summary
<!-- Briefly explain the motivation, context, and purpose of this pull request -->
- 

## Changes
<!-- List the key changes and technical implementation details -->
- 

## Verification & Testing
<!-- Describe how these changes were tested or steps to verify -->
- [ ] Automated tests passed (`npm test`, `npm run lint`, etc.)
- [ ] Manual verification steps:
  1. 
  2. 

## Impact & Breaking Changes
- Impact area: 
- Breaking changes: None / Yes (Details: )

## Related Issues
- Closes #
```

---

## 3. Compact / Minimal Template

```markdown
### What & Why
- 

### Key Changes
- 

### How to Test
- [ ] 
```
