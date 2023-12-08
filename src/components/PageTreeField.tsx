import { Stack, Flex, Spinner, Card, Dialog, Box } from '@sanity/ui';
import { useMemo, useState } from 'react';
import { ObjectFieldProps, ReferenceValue, FormField, set, useFormValue, SanityDocument } from 'sanity';
import styled from 'styled-components';

import { PageTreeEditor } from './PageTreeEditor';
import { DRAFTS_PREFIX, findPageTreeItemById, flatMapPageTree } from '../helpers/page-tree';
import { useOptimisticState } from '../hooks/useOptimisticState';
import { usePageTree } from '../hooks/usePageTree';
import { PageTreeConfigProvider } from '../hooks/usePageTreeConfig';
import { PageTreeConfig, PageTreeItem } from '../types';

export const PageTreeField = (
  props: ObjectFieldProps<ReferenceValue> & {
    config: PageTreeConfig;
    mode?: 'select-parent' | 'select-page';
    inputProps: { schemaType: { to?: { name: string }[] } };
  },
) => {
  const mode = props.mode ?? 'select-page';
  const form = useFormValue([]) as SanityDocument;
  const { pageTree } = usePageTree(props.config);

  const allowedPageTypes = props.inputProps.schemaType.to?.map(t => t.name);

  const [isPageTreeDialogOpen, setIsPageTreeDialogOpen] = useState(false);

  const parentId = props.inputProps.value?._ref;
  const pageId = form._id?.replace(DRAFTS_PREFIX, '');

  const fieldPage = useMemo(() => (pageTree ? findPageTreeItemById(pageTree, pageId) : undefined), [pageTree, pageId]);
  const parentPage = useMemo(
    () => (pageTree && parentId ? findPageTreeItemById(pageTree, parentId) : undefined),
    [pageTree, parentId],
  );

  const flatFieldPages = useMemo(() => (fieldPage ? flatMapPageTree([fieldPage]) : []), [fieldPage]);

  const [parentUrl, setOptimisticParentUrl] = useOptimisticState<string | undefined>(parentPage?.url);

  // Some page tree items are not suitable options for a new parent reference.
  // Disable the current parent page, the current page and all of its children.
  const disabledParentIds =
    mode !== 'select-parent' ? [] : [...(parentId ? [parentId] : []), ...flatFieldPages.map(page => page._id)];
  // Initially open the current page and all of its parents
  const openItemIds = fieldPage?._id ? [fieldPage?._id] : undefined;

  const openDialog = () => {
    setIsPageTreeDialogOpen(true);
  };

  const closeDialog = () => {
    setIsPageTreeDialogOpen(false);
  };

  const selectParentPage = (page: PageTreeItem) => {
    props.inputProps.onChange(set({ _ref: page._id, _type: 'reference' }));
    setOptimisticParentUrl(page.url);
    closeDialog();
  };

  return (
    <PageTreeConfigProvider config={props.config}>
      <FormField title={props.title} inputId={props.inputId} validation={props.validation}>
        <Stack space={3}>
          {!pageTree ? (
            <Flex paddingY={4} justify="center" align="center">
              <Spinner />
            </Flex>
          ) : (
            <Card padding={1} shadow={1} radius={2}>
              <SelectedItemCard padding={3} radius={2} onClick={openDialog}>
                {parentId ? parentUrl ?? 'Select page' : 'Select page'}
              </SelectedItemCard>
            </Card>
          )}
        </Stack>
        {pageTree && isPageTreeDialogOpen && (
          <Dialog
            header={'Select page'}
            id="parent-page-tree"
            zOffset={1000}
            width={1}
            onClose={closeDialog}
            onClickOutside={closeDialog}>
            <Box padding={4}>
              <PageTreeEditor
                allowedPageTypes={allowedPageTypes}
                pageTree={pageTree}
                onItemClick={selectParentPage}
                disabledItemIds={disabledParentIds}
                initialOpenItemIds={openItemIds}
              />
            </Box>
          </Dialog>
        )}
      </FormField>
    </PageTreeConfigProvider>
  );
};

const SelectedItemCard = styled(Card)`
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.sanity.color.card.hovered.bg};
  }
`;
