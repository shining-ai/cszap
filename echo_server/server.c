#include <stdio.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netdb.h>
#include <string.h>
#include <pthread.h>
#include <stdlib.h>
#define PORT 8080
#define BUFFER_SIZE 1024

void *handle_client(void *client_socket)
{
    int client_socket_fd = *(int *)client_socket;
    free(client_socket);
    char buffer[BUFFER_SIZE];
    int bytes_read;

    while (1)
    {
        memset(buffer, 0, BUFFER_SIZE);
        bytes_read = read(client_socket_fd, buffer, BUFFER_SIZE);
        if (bytes_read <= 0)
        {
            printf("Client disconnected.\n");
            break;
        }

        printf("Received: %s", buffer);
        // クライアントにデータを送り返す
        send(client_socket_fd, buffer, bytes_read, 0);
    }
}

int main()
{
    int socket_fd;
    int new_socket_fd;
    struct sockaddr_in server_addr, client_addr;
    char buffer[BUFFER_SIZE];
    socklen_t addr_len = sizeof(client_addr);

    // socket_fd = socket(AF_INET6, SOCK_STREAM, 0);
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);

    // アドレス設定
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    bind(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr));
    listen(socket_fd, 1);
    printf("Echo server is running on port %d...\n", PORT);

    // new_socket_fd; = accept(socket_fd, (struct sockaddr *)&client_addr, &addr_len);
    // printf("Client connected.\n");

    while (1)
    {
        printf("Waiting for client...\n");
        new_socket_fd = accept(socket_fd, (struct sockaddr *)&client_addr, &addr_len);
        printf("Client connected.\n");

        pthread_t tid;
        int *client_socket_fd = malloc(sizeof(int));
        *client_socket_fd = new_socket_fd;
        pthread_create(&tid, NULL, handle_client, client_socket_fd);

        pthread_detach(tid);

    }

    // ソケットを閉じる
    // close(client_socket_fd);
    close(socket_fd);
}
