import {
  memo,
  type ReactNode,
  useMemo,
  useState,
  useEffect,
  isValidElement,
} from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  Box,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import type { SystemStyleObject, Theme } from "@mui/system";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import { AttackPowerType } from "../../calculator/calculator.ts";
import type { Weapon, WeaponAttackResult } from "../../calculator/calculator.ts";
import type { SortBy } from "../../search/sortWeapons.ts";
import getWeaponTableColumns from "./getWeaponTableColumns.tsx";
import {
  Scrollbar,
  ScrollbarThumb,
  WeaponTableBody,
  WeaponTableColumn,
  WeaponTableColumnGroup,
  WeaponTableColumnGroupHeaderRow,
  WeaponTableColumnHeaderRow,
  WeaponTableDataRow,
  WeaponTableGroup,
  WeaponTableGroupHeaderRow,
} from "./tableStyledComponents.tsx";
import type { WeakRateType } from "../../calculator/weakRates.ts";

export type WeaponTableRowData = [Weapon, WeaponAttackResult];

export interface WeaponTableRowGroup {
  key: string;
  name?: string;
  rows: readonly WeaponTableRowData[];
}

export interface WeaponTableColumnDef {
  key: string;
  sortBy?: SortBy;
  header: ReactNode;
  render(row: WeaponTableRowData): ReactNode;
  sx?: SystemStyleObject<Theme> | ((theme: Theme) => SystemStyleObject<Theme>);
}

export interface WeaponTableColumnGroupDef {
  key: string;
  header?: string;
  columns: readonly WeaponTableColumnDef[];
  sx?: SystemStyleObject<Theme> | ((theme: Theme) => SystemStyleObject<Theme>);
}

interface Props {
  regulationVersionName: string;

  rowGroups: readonly WeaponTableRowGroup[];
  placeholder?: ReactNode;
  footer?: ReactNode;
  sortBy: SortBy;
  reverse: boolean;

  /**
   * If true, include columns for each individual damage type as well as total attack power
   */
  splitDamage: boolean;

  /**
   * If true, the columns for each individual damage type will display in the format "base + scaling" just like in the games
   */
  showBaseDamage: boolean;

  /**
   * If true, include columns for each individual damage type for Spell Scaling
   */
  splitSpellScaling: boolean;

  /**
   * If true, show scaling as integers instead of S/A/B/C/D/E ranks
   */
  numericalScaling: boolean;

  /**
   * If true, table show a percentage indicating the % bonus from weapon scaling
   */
  showScalingAsPercent: boolean;

  /**
   * Attack power types that must be included as columns in the table
   */
  attackPowerTypes: ReadonlySet<AttackPowerType>;

  /**
   * Weak rate types that must be included as columns in the table
   */
  weakRateTypes: ReadonlySet<WeakRateType>;

  /**
   * Include spell scaling columns in the table
   */
  spellScaling: boolean;

  onSortByChanged(sortBy: SortBy): void;
  onReverseChanged(reverse: boolean): void;
}

/**
 * The row in the weapon table containing headers for each column
 */
const ColumnHeaderRow = memo(function ColumnHeaderRow({
  columnGroups,
  sortBy,
  reverse,
  onSortByChanged,
  onReverseChanged,
}: {
  columnGroups: readonly WeaponTableColumnGroupDef[];
  sortBy: SortBy;
  reverse: boolean;
  onSortByChanged(sortBy: SortBy): void;
  onReverseChanged(reverse: boolean): void;
}) {
  const onColumnClicked = (column: WeaponTableColumnDef) => {
    if (column.sortBy) {
      if (column.sortBy === sortBy) {
        onReverseChanged(!reverse);
      } else {
        onSortByChanged(column.sortBy);
        onReverseChanged(false);
      }
    }
  };

  return (
    <WeaponTableColumnHeaderRow role="row">
      {columnGroups.map(({ key, sx, columns }) => (
        <WeaponTableColumnGroup key={key} sx={sx}>
          {columns.map((column) => (
            <Box
              key={column.key}
              display="grid"
              sx={[
                {
                  flex: "1 1 0",
                  gridTemplateRows: "24px 1fr",
                  alignItems: "start",
                  justifyContent: "center",
                  borderRadius: "9999px",
                  position: "relative",
                  pt: 1,
                },
                column.sortBy
                  ? {
                      cursor: "pointer",
                      userSelect: "none",
                      ":hover": { backgroundColor: "rgba(245, 189, 99, 0.08)" },
                    }
                  : {},
                column.sx ?? {},
              ]}
              tabIndex={0}
              role="columnheader"
              aria-sort={
                column.sortBy === sortBy ? (reverse ? "ascending" : "descending") : undefined
              }
              onClick={column.sortBy ? () => onColumnClicked(column) : undefined}
              onKeyDown={
                column.sortBy
                  ? (evt) => {
                      if (evt.key === " " || evt.key === "Enter") {
                        onColumnClicked(column);
                        evt.preventDefault();
                      }
                    }
                  : undefined
              }
            >
              {column.header}
              {column.sortBy === sortBy &&
                (reverse ? (
                  <ArrowDropUpIcon sx={{ justifySelf: "center" }} fontSize="small" />
                ) : (
                  <ArrowDropDownIcon sx={{ justifySelf: "center" }} fontSize="small" />
                ))}
            </Box>
          ))}
        </WeaponTableColumnGroup>
      ))}
    </WeaponTableColumnHeaderRow>
  );
});

/**
 * A row in the weapon table containing a single weapon
 */
const DataRow = memo(function DataRow({
  columnGroups,
  row,
}: {
  columnGroups: readonly WeaponTableColumnGroupDef[];
  row: WeaponTableRowData;
}) {
  return (
    <WeaponTableDataRow role="row">
      {columnGroups.map(({ key, sx, columns }) => (
        <WeaponTableColumnGroup key={key} sx={sx}>
          {columns.map((column) => (
            <WeaponTableColumn key={column.key} role="cell" sx={column.sx}>
              {column.render(row)}
            </WeaponTableColumn>
          ))}
        </WeaponTableColumnGroup>
      ))}
    </WeaponTableDataRow>
  );
});

const columnStorageKey =
  "err-calculator-hidden-columns-v1";

function getColumnId(
  group: WeaponTableColumnGroupDef,
  column: WeaponTableColumnDef
): string {
  return group.key + ":" + column.key;
}

function getColumnLabel(
  column: WeaponTableColumnDef
): ReactNode {
  if (isValidElement<{
    title?: string;
    alt?: string;
    children?: ReactNode;
  }>(column.header)) {
    return column.header.props.title
      ?? column.header.props.alt
      ?? column.header.props.children
      ?? column.key;
  }

  return column.header ?? column.key;
}

function loadHiddenColumns(): string[] {
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(columnStorageKey) ?? "[]"
    );

    return Array.isArray(saved)
      ? saved.filter(
          (value): value is string =>
            typeof value === "string"
        )
      : [];
  } catch {
    return [];
  }
}

interface ColumnPickerProps {
  groups: readonly WeaponTableColumnGroupDef[];
  hidden: ReadonlySet<string>;
  onChange(ids: string[], hide: boolean): void;
  onReset(): void;
}

function ColumnPicker({
  groups,
  hidden,
  onChange,
  onReset,
}: ColumnPickerProps) {
  const [open, setOpen] = useState(false);

  const optionalGroups = groups.filter(
    group => group.key !== "name"
  );

  const allIds = optionalGroups.flatMap(
    group => group.columns.map(
      column => getColumnId(group, column)
    )
  );

  const visibleCount = allIds.filter(
    id => !hidden.has(id)
  ).length;

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Button
          variant="outlined"
          size="small"
          onClick={() => setOpen(true)}
        >
          Customize Columns
        </Button>

        <Typography
          variant="caption"
          color="text.secondary"
        >
          {visibleCount} / {allIds.length} optional columns
        </Typography>
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Customize Weapon Columns
        </DialogTitle>

        <DialogContent dividers>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2 }}
          >
            Choose which columns appear in the weapon table.
            Your preferences are saved automatically.
          </Typography>

          <Box
            display="flex"
            flexWrap="wrap"
            gap={1}
            sx={{ mb: 2 }}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={() => onChange(allIds, false)}
            >
              Show All
            </Button>

            <Button
              size="small"
              variant="outlined"
              onClick={() => onChange(allIds, true)}
            >
              Hide All Optional
            </Button>

            <Button
              size="small"
              onClick={onReset}
            >
              Reset Defaults
            </Button>
          </Box>

          {optionalGroups.map(group => {
            const ids = group.columns.map(
              column => getColumnId(group, column)
            );

            const allVisible = ids.every(
              id => !hidden.has(id)
            );

            const someVisible = ids.some(
              id => !hidden.has(id)
            );

            return (
              <Box key={group.key} sx={{ mb: 2 }}>
                <Divider sx={{ mb: 1 }} />

                <FormControlLabel
                  label={
                    <Typography fontWeight={600}>
                      {group.header ??
                        (group.key === "nameEnd"
                          ? "Trailing Weapon Name"
                          : group.key === "attack"
                            ? "Attack Power"
                            : group.key)}
                    </Typography>
                  }
                  control={
                    <Checkbox
                      checked={allVisible}
                      indeterminate={
                        someVisible && !allVisible
                      }
                      onChange={() =>
                        onChange(ids, allVisible)
                      }
                    />
                  }
                />

                <Box
                  display="grid"
                  sx={{
                    pl: 2,
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                    },
                  }}
                >
                  {group.columns.map(column => {
                    const id = getColumnId(group, column);

                    return (
                      <FormControlLabel
                        key={id}
                        label={getColumnLabel(column)}
                        control={
                          <Checkbox
                            size="small"
                            checked={!hidden.has(id)}
                            onChange={event =>
                              onChange(
                                [id],
                                !event.target.checked
                              )
                            }
                          />
                        }
                      />
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function WeaponTable({
  regulationVersionName,
  rowGroups,
  placeholder,
  footer,
  sortBy,
  reverse,
  splitDamage,
  showBaseDamage,
  splitSpellScaling,
  numericalScaling,
  showScalingAsPercent,
  attackPowerTypes,
  weakRateTypes,
  spellScaling,
  onSortByChanged,
  onReverseChanged,
}: Props) {
  const allColumnGroups = useMemo(
    () =>
      getWeaponTableColumns({
        regulationVersionName,
        splitDamage,
        showBaseDamage,
        splitSpellScaling,
        numericalScaling,
        showScalingAsPercent,
        attackPowerTypes,
        weakRateTypes,
        spellScaling,
      }),
    [regulationVersionName, splitDamage, showBaseDamage, splitSpellScaling, numericalScaling, showScalingAsPercent, attackPowerTypes, weakRateTypes, spellScaling],
  );

  const [hiddenColumns, setHiddenColumns] =
    useState<string[]>(loadHiddenColumns);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        columnStorageKey,
        JSON.stringify(hiddenColumns)
      );
    } catch {
      // Column selection still works if storage is unavailable.
    }
  }, [hiddenColumns]);

  const hiddenSet = useMemo(
    () => new Set(hiddenColumns),
    [hiddenColumns]
  );

  const columnGroups = useMemo<
    WeaponTableColumnGroupDef[]
  >(() => {
    return allColumnGroups.flatMap(group => {
      // Keep the main weapon name visible.
      if (group.key === "name") return [group];

      const columns = group.columns.filter(
        column => !hiddenSet.has(
          getColumnId(group, column)
        )
      );

      // Remove empty groups.
      if (columns.length === 0) return [];

      // Preserve the original layout when nothing is hidden.
      if (columns.length === group.columns.length) {
        return [group];
      }

      const sx = group.sx;

      // Shrink groups when individual columns are hidden.
      if (
        sx &&
        typeof sx === "object" &&
        "width" in sx &&
        typeof sx.width === "number"
      ) {
        const width = Math.max(
          80,
          Math.round(
            27 + (sx.width - 27) *
            columns.length / group.columns.length
          )
        );

        return [{
          ...group,
          columns,
          sx: { ...sx, width },
        }];
      }

      return [{ ...group, columns }];
    });
  }, [allColumnGroups, hiddenSet]);

  function changeColumnVisibility(
    ids: string[],
    hide: boolean
  ) {
    setHiddenColumns(previous => {
      const next = new Set(previous);

      for (const id of ids) {
        if (hide) next.add(id);
        else next.delete(id);
      }

      return [...next];
    });
  }

  return (
    <>
      <ColumnPicker
        groups={allColumnGroups}
        hidden={hiddenSet}
        onChange={changeColumnVisibility}
        onReset={() => setHiddenColumns([])}
      />

    <ScrollArea.Root asChild>
      <WeaponTableBody role="table">
        <ScrollArea.Viewport>
          <WeaponTableColumnGroupHeaderRow role="row">
            {columnGroups.map(({ key, sx, header }) => (
              <WeaponTableColumnGroup
                key={key}
                sx={[sx ?? {}, { alignItems: "center", justifyContent: "center" }]}
              >
                {header && (
                  <Typography component="span" variant="subtitle2" role="columnheader">
                    {header}
                  </Typography>
                )}
              </WeaponTableColumnGroup>
            ))}
          </WeaponTableColumnGroupHeaderRow>

          <ColumnHeaderRow
            columnGroups={columnGroups}
            sortBy={sortBy}
            reverse={reverse}
            onSortByChanged={onSortByChanged}
            onReverseChanged={onReverseChanged}
          />
          {rowGroups.length > 0 ? (
            rowGroups.map(({ key, name, rows }) => (
              <WeaponTableGroup key={key} role="rowgroup">
                {name != null && (
                  <WeaponTableGroupHeaderRow role="row">
                    <Typography component="span" variant="subtitle2" role="columnheader">
                      {name}
                    </Typography>
                  </WeaponTableGroupHeaderRow>
                )}

                {rows.map((row) => (
                  <DataRow
                    key={`${row[0].weaponName},${row[0].affinityId},${row[0].variant ?? ""}`}
                    columnGroups={columnGroups}
                    row={row}
                  />
                ))}
              </WeaponTableGroup>
            ))
          ) : (
            <Box display="grid" sx={{ minHeight: "480px", px: "10px", gap: 3 }}>
              {placeholder}
            </Box>
          )}
          {footer != null && (
            <Box display="grid" sx={{ minHeight: "36px", px: "10px" }}>
              {footer}
            </Box>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar asChild orientation="horizontal">
          <Scrollbar>
            <ScrollArea.Thumb asChild>
              <ScrollbarThumb />
            </ScrollArea.Thumb>
          </Scrollbar>
        </ScrollArea.Scrollbar>
      </WeaponTableBody>
    </ScrollArea.Root>
    </>
  );
}

export default memo(WeaponTable);
