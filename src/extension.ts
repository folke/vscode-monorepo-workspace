/* eslint-disable unicorn/prefer-starts-ends-with */

import * as path from "path"
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
  for (const type of ["apps", "libs", "tools"]) {
    const regex = config.get<string>(`regex.${type}`)
    const prefix = config.get<string>(`prefix.${type}`)
    if (regex && prefix) {
      if (new RegExp(regex, "u").test(dir)) return prefix
    }
  }
  return config.get<string>("prefix.other") || ""
}

async function getPackageFolders(): Promise<WorkspaceFolderItem[] | undefined> {
  const cwd = vscodeWorkspace.workspaceFolders?.[0].uri.fsPath
  if (cwd) {
    const workspace = await getWorkspace({
      cwd,
      includeRoot: true,
    })
    if (workspace) {
      const rootPkg = workspace.getPackageForRoot(workspace.root)
      return [
        {
          label: `${getFolderEmoji(workspace.root, workspace.root)}${rootPkg ||
            "root"}`,
          description: `${workspace.type[0].toUpperCase() +
            workspace.type.slice(1)} Workspace Root`,
          root: Uri.parse(workspace.root),
          isRoot: true,
        },
        ...workspace
          .getPackages()
          .filter(p => p.root !== workspace.root)
          .map(p => {
            return {
              label: `${getFolderEmoji(workspace.root, p.root)}${p.name}`,
              description: `at ${path.relative(workspace.root, p.root)}`,
              root: Uri.parse(p.root),
              isRoot: false,
            }
          })
          .sort((a, b) => a.root.fsPath.localeCompare(b.root.fsPath)),
      ]
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

async function updateAll(items?: WorkspaceFolderItem[]) {
  if (!items) items = await getPackageFolders()
  if (!items) return
  const itemsSet = new Set(items.map(item => item.root.fsPath))
  const folders = vscodeWorkspace.workspaceFolders
  const adds: { name: string; uri: Uri }[] = []
  if (folders) {
    adds.push(...folders.filter(f => !itemsSet.has(f.uri.fsPath)))
  }
  adds.push(
    ...items.map(item => ({
      name: item.label,
      uri: item.root,
    }))
  )
  vscodeWorkspace.updateWorkspaceFolders(0, folders?.length, ...adds)
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
          commands.executeCommand("vscode.openFolder", item.root)
          break
        case PackageAction.newWindow:
          commands.executeCommand("vscode.openFolder", item.root, true)
          break
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
    )
  )
  context.subscriptions.push(
    commands.registerCommand("extension.openPackageNewWindow", () =>
      openPackage(PackageAction.newWindow)
    )
  )
  context.subscriptions.push(
    commands.registerCommand("extension.openPackageWorkspaceFolder", () =>
      openPackage(PackageAction.workspaceFolder)
    )
  )

  context.subscriptions.push(
    commands.registerCommand("extension.updateAll", () => updateAll())
  )
}

// this method is called when your extension is deactivated
export function deactivate() {
  true
}
