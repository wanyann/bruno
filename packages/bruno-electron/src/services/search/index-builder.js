const path = require('node:path');
const { searchForRequestFiles } = require('../../utils/filesystem');
const { getPool, JobType } = require('../pool');
const { defaultClassify } = require('../../utils/mount');
const { buildTree } = require('../mount/tree-builder');
const { getRequestUid } = require('../../cache/requestUids');

/**
 * Build a flat, searchable index of all requests in a collection by reading
 * its files from disk (works for unmounted collections too).
 *
 * Returns an array of request descriptors:
 *   { uid, name, type, method, url, pathname }
 */
// parse all request/folder/environment files of a collection into parserResults
const readParserResults = async (collectionPath) => {
  const files = searchForRequestFiles(collectionPath, collectionPath) || [];

  const toParse = [];
  for (const absolutePath of files) {
    const relativePath = path.relative(collectionPath, absolutePath);
    const cls = defaultClassify(relativePath);
    if (!cls) continue;
    if (cls.type === 'config' || cls.type === 'collection') continue;
    toParse.push({ absolutePath, relativePath, format: cls.format, type: cls.type });
  }

  if (toParse.length === 0) {
    return new Map();
  }

  const pool = getPool();
  const parsed = new Map();
  await Promise.allSettled(
    toParse.map(async ({ absolutePath, relativePath, format: f, type }) => {
      try {
        const result = await pool.run(JobType.ParseFile, {
          collectionPath,
          relativePath,
          format: f,
          type
        });
        parsed.set(relativePath, result);
      } catch (err) {
        parsed.set(relativePath, {
          relativePath,
          data: {},
          error: { message: err.message }
        });
      }
    })
  );

  return parsed;
};

const flattenTreeItems = (items, out = []) => {
  for (const item of items) {
    if (item.type === 'folder') {
      flattenTreeItems(item.items || [], out);
    } else {
      out.push(item);
    }
  }
  return out;
};

// extract only the fields the search UI needs
const toSearchDescriptor = (node) => {
  const request = node.request || {};
  let method = request.method || '';
  let url = request.url || '';

  if (request.type === 'grpc') {
    const methodType = request.methodType || 'UNARY';
    method = methodType.toLowerCase().replace(/[_]/g, '-');
  }

  return {
    uid: node.uid,
    name: node.name,
    type: node.type,
    method,
    url,
    pathname: node.pathname
  };
};

const buildRequestIndex = async (collectionPath) => {
  const collectionPathResolved = path.resolve(collectionPath);
  const parserResults = await readParserResults(collectionPathResolved);

  const tree = buildTree(collectionPathResolved, parserResults, {
    uidFor: getRequestUid
  });

  const requests = flattenTreeItems(tree.items || []);
  return requests.map(toSearchDescriptor);
};

module.exports = { buildRequestIndex, readParserResults };
