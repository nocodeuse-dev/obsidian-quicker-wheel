# Center Wheel Action Design

## Goal

Turn the wheel center into a dedicated editable action while keeping the current purple lightning icon and making the default action open Quicker Wheel settings.

## Design

- Store the center as a normal `WheelAction` with `placement: "center"`.
- Existing actions without `placement` remain regular wheel actions.
- Add a default center action named `插件设置`, using icon `zap` and command `quicker-wheel:open-settings`.
- During settings migration, add the default center action when older saved data does not contain one.
- Ring slot lookup must ignore center actions so the center never occupies or conflicts with a normal segment.
- The actual wheel executes the center action when tapped.
- The settings preview selects the center action when tapped and uses the existing action editor.
- A selected center gets the same red selection border used by selected segments.
- Deleting the center action restores the default center action instead of leaving the wheel without a center action.

## Validation

- Test default creation and migration from existing settings.
- Test custom center action preservation.
- Test reset-to-default behavior.
- Test that center actions are excluded from normal wheel slot lookup.
- Run the complete test suite, production build, vault sync, and plugin reload.
