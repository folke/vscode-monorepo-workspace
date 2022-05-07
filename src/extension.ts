// eslint-disable-next-line unicorn/import-style
import path from "path"
import { getWorkspace } from "ultra-runner"
import {
  commands,
  ExtensionContext,
  QuickPickItem,
  Uri,
  window,
  workspace as vscodeWorkspace,
} from "vscode"

interface WorkspaceFolderItem extends QuickPickItem {
  root: Uri
  isRoot: boolean
  description: string
}

function getFolderEmoji(root: string, pkgRoot: string) {
  const config = vscodeWorkspace.getConfiguration("monorepoWorkspace.folders")
  if (root == pkgRoot) return config.get<string>("prefix.root") || ""
  const dir = path.relative(root, pkgRoot)

  // Use custom prefixes first
  const custom = config.get<{ regex: string; prefix: string }[]>("custom")
  if (custom?.length) {
    for (const c of custom) {
      if (c.prefix && c.regex && new RegExp(c.regex, "u").test(dir))
        return c.prefix
    }
  }

  for (const type of ["apps", "libs", "tools"]) {
    const regex = config.get<string>(`regex.${type}`)
    const prefix = config.get<string>(`prefix.${type}`)
    if (regex && prefix && new RegExp(regex, "u").test(dir)) return prefix
  }
  return config.get<string>("prefix.unknown") || ""
}

async function getPackageFolders(
  includeRoot = true
): Promise<WorkspaceFolderItem[] | undefined> {
  const config = vscodeWorkspace.getConfiguration("monorepoWorkspace.folders")
  const cwd = vscodeWorkspace.workspaceFolders?.[0].uri.fsPath
  if (cwd) {
    const workspace = await getWorkspace({
      cwd,
      includeRoot: true,
    })
    if (workspace) {
      const ret: WorkspaceFolderItem[] = []
      if (includeRoot)
        ret.push({
          label: `${getFolderEmoji(workspace.root, workspace.root)}${
            workspace.getPackageForRoot(workspace.root) || "root"
          }`,
          description: `${
            workspace.type[0].toUpperCase() + workspace.type.slice(1)
          } Workspace Root`,
          root: Uri.file(workspace.root),
          isRoot: true,
        })
      ret.push(
        ...workspace
          .getPackages()
          .filter((p) => p.root !== workspace.root)
          .map((p) => {
            const name = config.get<boolean>("removeScope")
              ? p.name.replace(/^@.+\//u, "")
              : p.name
            return {
              label: `${getFolderEmoji(workspace.root, p.root)}${name}`,
              description: `at ${path.relative(workspace.root, p.root)}`,
              root: Uri.file(p.root),
              isRoot: false,
            }
          })
          .sort((a, b) => a.root.fsPath.localeCompare(b.root.fsPath))
      )
      return ret
    }
  }
}

enum PackageAction {
  newWindow,
  currentWindow,
  workspaceFolder,
}

function addWorkspaceFolder(item: WorkspaceFolderItem) {
  const folders = vscodeWorkspace.workspaceFolders
  let start = 0
  let deleteCount = 0
  if (folders)
    for (const folder of folders) {
      if (folder.uri == item.root) {
        // Nothing to update
        if (folder.name == item.label) return
        deleteCount = 1
        break
      }
      start++
    }
  vscodeWorkspace.updateWorkspaceFolders(start, deleteCount, {
    name: item.label,
    uri: item.root,
  })
}

async function updateAll(items?: WorkspaceFolderItem[], clean = false) {
  const config = vscodeWorkspace.getConfiguration("monorepoWorkspace")
  if (!items) items = await getPackageFolders(config.get("includeRoot"))
  if (!items) return
  const itemsSet = new Set(items.map((item) => item.root.fsPath))
  const folders = vscodeWorkspace.workspaceFolders
  const adds: { name: string; uri: Uri }[] = []
  if (folders && !clean) {
    adds.push(...folders.filter((f) => !itemsSet.has(f.uri.fsPath)))
  }
  adds.push(
    ...items.map((item) => ({
      name: item.label,
      uri: item.root,
    }))
  )
  vscodeWorkspace.updateWorkspaceFolders(0, folders?.length, ...adds)
}

async function select(items?: WorkspaceFolderItem[]) {
  if (!items) items = await getPackageFolders()
  if (!items) return
  const itemsSet = new Map(items.map((item) => [item.root.fsPath, item]))
  const folders = vscodeWorkspace.workspaceFolders

  if (folders) {
    for (const folder of folders) {
      if (itemsSet.has(folder.uri.fsPath)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        itemsSet.get(folder.uri.fsPath)!.picked = true
      } else {
        items.push({
          root: folder.uri,
          isRoot: false,
          label: folder.name,
          description: "",
          picked: true,
        })
      }
    }
  }

  const picked = await window.showQuickPick(items, {
    canPickMany: true,
    matchOnDescription: true,
  })
  if (picked?.length) return updateAll(picked, true)
}

async function openPackage(action: PackageAction) {
  const items = await getPackageFolders()
  if (items) {
    const item = await window.showQuickPick(items, {
      canPickMany: false,
      matchOnDescription: true,
    })
    if (item) {
      switch (action) {
        case PackageAction.currentWindow:
          return commands.executeCommand("vscode.openFolder", item.root)
        case PackageAction.newWindow:
          return commands.executeCommand("vscode.openFolder", item.root, true)
        case PackageAction.workspaceFolder:
          addWorkspaceFolder(item)
          break
      }
    }
  }
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("extension.openPackageCurrentWindow", () =>
      openPackage(PackageAction.currentWindow)
    ),
    commands.registerCommand("extension.openPackageNewWindow", () =>
      openPackage(PackageAction.newWindow)
    ),
    commands.registerCommand("extension.openPackageWorkspaceFolder", () =>
      openPackage(PackageAction.workspaceFolder)
    ),
    commands.registerCommand("extension.updateAll", () => updateAll()),
    commands.registerCommand("extension.select", () => select())
  )
}

// this method is called when your extension is deactivated
export function deactivate() {
  true
}
